import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    BasicSoundBank,
    type BasicZone,
    CustomCurve,
    Generator,
    Modulator,
    ModulatorSource,
    type SampleStoredData,
    SampleTypes,
    SoundBankLoader,
    type SoundBankInfoData
} from "spessasynth_core";
import type {
    CustomCurveView,
    InstrumentView,
    ModulatorSourceView,
    ModulatorView,
    PresetView,
    RangeView,
    SampleView,
    ZoneView
} from "../core_backend/entity_views.ts";
import type { ElementDiff, ViewDiff } from "../core_backend/view_diff.ts";

/*
 * The mirror is a second copy of one bank, which the synthesizer plays and which holds the sample
 * data. It never runs actions, it follows the editor's bank through patches made of views. It
 * imports nothing from React or the DOM, so it can move to the synthesizer's thread as is.
 */

/**
 * The editor's ids of the elements, in the order the file holds them.
 */
export interface MirrorIds {
    readonly presets: readonly number[];
    readonly instruments: readonly number[];
    readonly samples: readonly number[];
    readonly curves: readonly number[];
}

/**
 * One commit of the editor's bank.
 */
export interface MirrorPatch {
    readonly views: ViewDiff;
    /**
     * Only when it changed.
     */
    readonly info: SoundBankInfoData | undefined;
    /**
     * The new data of samples whose audio changed, by id.
     */
    readonly sampleData: ReadonlyMap<number, SampleStoredData>;
    /**
     * New samples whose data is a copy of a sample in a mirror (pasted or duplicated), by id.
     */
    readonly sampleCopies: ReadonlyMap<number, SampleCopySource>;
}

/**
 * The data a pasted sample gets, shared with its source (see `shareOwnStoredData`).
 */
export interface SampleCopySource {
    readonly data: SampleStoredData;
}

/**
 * A whole mirror as plain data, to build it again in another host: every element as a view
 * (in a diff from an empty bank), and the data of every sample it keeps, removed ones too, so
 * an undo that brings one back still finds it.
 */
export interface MirrorState {
    readonly type: BasicSoundBank["type"];
    readonly patch: MirrorPatch & { readonly info: SoundBankInfoData };
}

/**
 * An element of the mirror, by the editor's id.
 */
export interface MirrorTarget {
    readonly kind: "preset" | "instrument" | "sample";
    readonly id: number;
}

const UNSET_RANGE = { min: -1, max: 127 };

/**
 * A copy, so two samples never share an array that one of them changes.
 */
export function copyStoredData(stored: SampleStoredData): SampleStoredData {
    return stored.form === "float32"
        ? { form: stored.form, data: stored.data.slice() }
        : { form: stored.form, data: stored.data.slice() };
}

/**
 * The same data when its array is its own, which is safe to share as nothing changes stored
 * data in place (an edit or a conversion gives the sample new arrays). Data loaded from a file
 * is a view into all of it, and sharing that would keep the whole file alive after its bank
 * closes, so only the sample's own bytes are copied then.
 */
export function shareOwnStoredData(stored: SampleStoredData) {
    const { data } = stored;
    return data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
        ? stored
        : copyStoredData(stored);
}

type CurveViews = ReadonlyMap<CustomCurve, CustomCurveView>;

function sourceToView(
    source: ModulatorSource,
    curveViews: CurveViews
): ModulatorSourceView {
    const { curve } = source;
    return {
        index: source.index,
        curveType: source.curveType,
        isCC: source.isCC,
        isBipolar: source.isBipolar,
        isNegative: source.isNegative,
        curve: curve instanceof CustomCurve ? curveViews.get(curve) : undefined
    };
}

// The ids of zones and modulators only key the editor's rows, the mirror never reads them
function modulatorToView(
    modulator: Modulator,
    curveViews: CurveViews
): ModulatorView {
    return {
        id: 0,
        primarySource: sourceToView(modulator.primarySource, curveViews),
        secondarySource: sourceToView(modulator.secondarySource, curveViews),
        destination: modulator.destination,
        transformAmount: modulator.transformAmount,
        transformType: modulator.transformType
    };
}

function zoneToView(
    zone: BasicZone,
    childId: number | undefined,
    curveViews: CurveViews
): ZoneView {
    return {
        id: 0,
        keyRange: zone.hasKeyRange ? { ...zone.keyRange } : undefined,
        velocityRange: zone.hasVelRange ? { ...zone.velRange } : undefined,
        generators: zone.generators.map((g) => ({
            type: g.type,
            value: g.value
        })),
        modulators: zone.modulators.map((m) => modulatorToView(m, curveViews)),
        childId
    };
}

function buildRange(view: RangeView | undefined) {
    return view ? { min: view.min, max: view.max } : { ...UNSET_RANGE };
}

/**
 * Unlinks and drops the zones. A removed element has none, so it is rebuilt from its view
 * when it comes back.
 */
function clearZones(element: BasicPreset | BasicInstrument) {
    while (element.zones.length > 0) {
        const last = element.zones.length - 1;
        if (element instanceof BasicPreset) {
            element.deleteZone(last);
        } else {
            element.deleteZone(last, true);
        }
    }
}

function getOrThrow<T>(map: ReadonlyMap<number, T>, id: number, kind: string) {
    const element = map.get(id);
    if (!element) {
        throw new Error(`The mirror has no ${kind} with the id ${id}.`);
    }
    return element;
}

export class BankMirror {
    /**
     * Loads the same file as the editor. The samples point into the buffer, so it must not be
     * changed afterward.
     */
    public static fromFile(buffer: ArrayBuffer, ids: MirrorIds) {
        return new BankMirror(
            SoundBankLoader.fromArrayBuffer(buffer, { copySampleData: false }),
            ids
        );
    }

    /**
     * Builds a mirror from another host's `exportState`. Its sample data is used as is.
     */
    public static fromState(state: MirrorState) {
        // The default modulators and their curves come with the patch
        const bank = new BasicSoundBank(state.type, false);
        const mirror = new BankMirror(bank, {
            presets: [],
            instruments: [],
            samples: [],
            curves: []
        });
        mirror.apply(state.patch);
        return mirror;
    }

    // Removed elements stay in these maps, so an undo that brings one back finds it with its data
    private readonly presets = new Map<number, BasicPreset>();
    private readonly instruments = new Map<number, BasicInstrument>();
    private readonly samples = new Map<number, BasicSample>();
    private readonly sampleIds = new WeakMap<BasicSample, number>();
    // Curves that left the bank stay too, an undo brings their modulators back
    private readonly curves = new Map<number, CustomCurve>();
    /**
     * The last views applied, to rebuild zones only when they changed.
     */
    private readonly presetViews = new Map<number, PresetView>();
    private readonly instrumentViews = new Map<number, InstrumentView>();
    public readonly bank: BasicSoundBank;

    /**
     * @param bank the bank, in the order of the file
     * @param ids the editor's ids, in the same order
     */
    public constructor(bank: BasicSoundBank, ids: MirrorIds) {
        const isSameShape =
            bank.presets.length === ids.presets.length &&
            bank.instruments.length === ids.instruments.length &&
            bank.samples.length === ids.samples.length &&
            bank.customCurves.length === ids.curves.length;
        if (!isSameShape) {
            throw new Error("The mirror's bank does not match the editor's.");
        }
        this.bank = bank;
        for (const [i, preset] of bank.presets.entries()) {
            this.presets.set(ids.presets[i], preset);
        }
        for (const [i, instrument] of bank.instruments.entries()) {
            this.instruments.set(ids.instruments[i], instrument);
        }
        for (const [i, sample] of bank.samples.entries()) {
            this.samples.set(ids.samples[i], sample);
            this.sampleIds.set(sample, ids.samples[i]);
        }
        for (const [i, curve] of bank.customCurves.entries()) {
            this.curves.set(ids.curves[i], curve);
        }
    }

    private buildSource(view: ModulatorSourceView) {
        return new ModulatorSource(
            view.index,
            view.curve
                ? getOrThrow(this.curves, view.curve.id, "custom curve")
                : view.curveType,
            view.isCC,
            view.isBipolar,
            view.isNegative
        );
    }

    private buildModulators(views: readonly ModulatorView[]) {
        return views.map((view) => {
            return new Modulator(
                this.buildSource(view.primarySource),
                this.buildSource(view.secondarySource),
                view.destination,
                view.transformAmount,
                view.transformType
            );
        });
    }

    private applyZone(zone: BasicZone, view: ZoneView) {
        zone.keyRange = buildRange(view.keyRange);
        zone.velRange = buildRange(view.velocityRange);
        zone.generators = view.generators.map(
            (g) => new Generator(g.type, g.value, false)
        );
        zone.setModulators(this.buildModulators(view.modulators));
    }

    /**
     * The bank's curve list, as the editor has it. A curve keeps its object, so the
     * modulators that use it follow a change.
     */
    private applyCurves(views: readonly CustomCurveView[]) {
        this.bank.customCurves = views.map((view) => {
            let curve = this.curves.get(view.id);
            if (curve) {
                curve.name = view.name;
                curve.setPoints(view.points);
            } else {
                curve = new CustomCurve(view.points, view.name);
                this.curves.set(view.id, curve);
            }
            return curve;
        });
    }

    private applySamples(diff: ElementDiff<SampleView>) {
        for (const view of diff.changed) {
            if (this.samples.has(view.id)) {
                continue;
            }
            const sample = new BasicSample(
                view.name,
                view.sampleRate,
                view.originalKey,
                view.pitchCorrection,
                SampleTypes.monoSample,
                view.loopStart,
                view.loopEnd
            );
            this.samples.set(view.id, sample);
            this.sampleIds.set(sample, view.id);
        }
        for (const view of diff.changed) {
            const sample = getOrThrow(this.samples, view.id, "sample");
            sample.name = view.name;
            sample.sampleRate = view.sampleRate;
            sample.originalKey = view.originalKey;
            sample.pitchCorrection = view.pitchCorrection;
            sample.loopStart = view.loopStart;
            sample.loopEnd = view.loopEnd;
            // Set directly, as the editor's links can be one-sided while a sample is deleted
            sample.sampleType = view.type;
            sample.linkedSample =
                view.linkedSampleId === undefined
                    ? undefined
                    : getOrThrow(this.samples, view.linkedSampleId, "sample");
        }
        if (diff.order) {
            this.bank.samples = diff.order.map((id) =>
                getOrThrow(this.samples, id, "sample")
            );
        }
    }

    private applyInstruments(diff: ElementDiff<InstrumentView>) {
        for (const id of diff.removed) {
            const instrument = this.instruments.get(id);
            if (instrument) {
                clearZones(instrument);
            }
            this.instrumentViews.delete(id);
        }
        for (const view of diff.changed) {
            let instrument = this.instruments.get(view.id);
            if (!instrument) {
                instrument = new BasicInstrument();
                this.instruments.set(view.id, instrument);
            }
            instrument.name = view.name;
            const previous = this.instrumentViews.get(view.id);
            this.instrumentViews.set(view.id, view);
            if (previous?.globalZone !== view.globalZone) {
                this.applyZone(instrument.globalZone, view.globalZone);
            }
            if (previous?.zones === view.zones) {
                continue;
            }
            clearZones(instrument);
            for (const zoneView of view.zones) {
                const sample = getOrThrow(
                    this.samples,
                    zoneView.childId ?? -1,
                    "sample"
                );
                this.applyZone(instrument.createZone(sample), zoneView);
            }
        }
        if (diff.order) {
            this.bank.instruments = diff.order.map((id) =>
                getOrThrow(this.instruments, id, "instrument")
            );
        }
    }

    private applyPresets(diff: ElementDiff<PresetView>) {
        for (const view of diff.changed) {
            let preset = this.presets.get(view.id);
            if (!preset) {
                preset = new BasicPreset(this.bank);
                this.presets.set(view.id, preset);
            }
            preset.name = view.name;
            preset.program = view.program;
            preset.bankMSB = view.bankMSB;
            preset.bankLSB = view.bankLSB;
            preset.isGMGSDrum = view.isGMGSDrum;
            preset.library = view.library;
            preset.genre = view.genre;
            preset.morphology = view.morphology;
            const previous = this.presetViews.get(view.id);
            this.presetViews.set(view.id, view);
            if (previous?.globalZone !== view.globalZone) {
                this.applyZone(preset.globalZone, view.globalZone);
            }
            if (previous?.zones === view.zones) {
                continue;
            }
            clearZones(preset);
            for (const zoneView of view.zones) {
                const instrument = getOrThrow(
                    this.instruments,
                    zoneView.childId ?? -1,
                    "instrument"
                );
                this.applyZone(preset.createZone(instrument), zoneView);
            }
        }
        if (diff.order) {
            this.bank.presets = diff.order.map((id) =>
                getOrThrow(this.presets, id, "preset")
            );
        }
    }

    private applyPresetRemovals(diff: ElementDiff<PresetView>) {
        for (const id of diff.removed) {
            const preset = this.presets.get(id);
            if (preset) {
                clearZones(preset);
            }
            this.presetViews.delete(id);
        }
    }

    /**
     * Brings the mirror up to date with one commit. The children come first, so the zones
     * built after them find them.
     */
    public apply(patch: MirrorPatch) {
        const { views } = patch;
        // Before the zones and the default modulators, which look their curves up
        if (views.customCurves) {
            this.applyCurves(views.customCurves);
        }
        this.applySamples(views.samples);
        for (const [id, stored] of patch.sampleData) {
            getOrThrow(this.samples, id, "sample").setStoredData(stored);
        }
        // Pasted and duplicated samples share their source's own arrays
        for (const [id, source] of patch.sampleCopies) {
            getOrThrow(this.samples, id, "sample").setStoredData(
                shareOwnStoredData(source.data)
            );
        }
        // Presets first, so a removed preset lets go of its instruments before they are removed
        this.applyPresetRemovals(views.presets);
        this.applyInstruments(views.instruments);
        this.applyPresets(views.presets);
        const { changed, removed } = views.presets;
        // A patch change or an added or removed kit can make the bank XG or not, as in the editor
        if (changed.length > 0 || removed.length > 0) {
            this.bank.flush(false);
        }
        if (views.defaultModulators) {
            this.bank.defaultModulators = this.buildModulators(
                views.defaultModulators
            );
        }
        if (patch.info) {
            // A deep copy, as a format conversion changes the version object in place
            this.bank.soundBankInfo = structuredClone(patch.info);
        }
    }

    /**
     * The whole mirror as plain data for `fromState`. Removed presets and instruments are left
     * out, as an undo rebuilds them from their views anyway. The sample data is shared, not
     * copied, so this mirror must not be used afterward if it is transferred.
     */
    public exportState(): MirrorState {
        const idOf = new Map<object, number>();
        for (const map of [this.presets, this.instruments, this.samples]) {
            for (const [id, element] of map) {
                idOf.set(element, id);
            }
        }
        const getId = (element: object) => {
            const id = idOf.get(element);
            if (id === undefined) {
                throw new Error(
                    "The mirror's bank has an element without an id."
                );
            }
            return id;
        };
        const { bank } = this;
        const curveViews = new Map<CustomCurve, CustomCurveView>();
        for (const [id, curve] of this.curves) {
            curveViews.set(curve, {
                id,
                name: curve.name,
                points: curve.points
            });
        }
        const getCurveView = (curve: CustomCurve) => {
            const view = curveViews.get(curve);
            if (!view) {
                throw new Error("The mirror's bank has a curve without an id.");
            }
            return view;
        };
        const samples = new Array<SampleView>();
        const sampleData = new Map<number, SampleStoredData>();
        for (const [id, sample] of this.samples) {
            samples.push({
                id,
                name: sample.name,
                sampleRate: sample.sampleRate,
                originalKey: sample.originalKey,
                pitchCorrection: sample.pitchCorrection,
                loopStart: sample.loopStart,
                loopEnd: sample.loopEnd,
                type: sample.sampleType,
                linkedSampleId: sample.linkedSample
                    ? getId(sample.linkedSample)
                    : undefined,
                length: sample.sampleLength,
                isCompressed: sample.isCompressed,
                usedBy: [],
                audioRevision: 0
            });
            if (sample.hasData) {
                sampleData.set(id, sample.getStoredData());
            }
        }
        const instruments = bank.instruments.map(
            (instrument): InstrumentView => ({
                id: getId(instrument),
                name: instrument.name,
                globalZone: zoneToView(
                    instrument.globalZone,
                    undefined,
                    curveViews
                ),
                zones: instrument.zones.map((z) =>
                    zoneToView(z, getId(z.sample), curveViews)
                ),
                usedBy: []
            })
        );
        const presets = bank.presets.map((preset): PresetView => ({
            id: getId(preset),
            name: preset.name,
            program: preset.program,
            bankMSB: preset.bankMSB,
            bankLSB: preset.bankLSB,
            isGMGSDrum: preset.isGMGSDrum,
            isDrum: preset.isDrum,
            library: preset.library,
            genre: preset.genre,
            morphology: preset.morphology,
            globalZone: zoneToView(preset.globalZone, undefined, curveViews),
            zones: preset.zones.map((z) =>
                zoneToView(z, getId(z.instrument), curveViews)
            )
        }));
        return {
            type: bank.type,
            patch: {
                views: {
                    presets: {
                        changed: presets,
                        removed: [],
                        order: presets.map((p) => p.id)
                    },
                    instruments: {
                        changed: instruments,
                        removed: [],
                        order: instruments.map((i) => i.id)
                    },
                    samples: {
                        changed: samples,
                        removed: [],
                        order: bank.samples.map((s) => getId(s))
                    },
                    defaultModulators: bank.defaultModulators.map((m) =>
                        modulatorToView(m, curveViews)
                    ),
                    customCurves: bank.customCurves.map((c) => getCurveView(c))
                },
                info: structuredClone(bank.soundBankInfo),
                sampleData,
                sampleCopies: new Map()
            }
        };
    }

    public getSample(id: number) {
        return this.samples.get(id);
    }

    /**
     * Forgets removed samples that can never come back, with their data.
     */
    public releaseSamples(ids: Iterable<number>) {
        const inBank = new Set(this.bank.samples);
        for (const id of ids) {
            const sample = this.samples.get(id);
            if (!sample || inBank.has(sample)) {
                continue;
            }
            this.samples.delete(id);
            sample.releaseData();
        }
    }

    /**
     * The editor's id of one of the mirror's samples.
     */
    public getSampleId(sample: BasicSample) {
        const id = this.sampleIds.get(sample);
        if (id === undefined) {
            throw new Error(`The sample "${sample.name}" is not the mirror's.`);
        }
        return id;
    }

    /**
     * The mirror's element for an editor's element, if it has one.
     */
    public resolve(target: MirrorTarget) {
        switch (target.kind) {
            case "preset": {
                return this.presets.get(target.id);
            }
            case "instrument": {
                return this.instruments.get(target.id);
            }
            case "sample": {
                return this.samples.get(target.id);
            }
        }
    }
}
