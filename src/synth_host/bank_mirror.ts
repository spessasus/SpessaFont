import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    type BasicSoundBank,
    type BasicZone,
    Generator,
    Modulator,
    type ModulatorSource,
    type SampleStoredData,
    SampleTypes,
    SoundBankLoader,
    type SoundBankInfoData
} from "spessasynth_core";
import type {
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
}

/**
 * An element of the mirror, by the editor's id.
 */
export interface MirrorTarget {
    readonly kind: "preset" | "instrument" | "sample";
    readonly id: number;
}

const UNSET_RANGE = { min: -1, max: 127 };

function applySource(source: ModulatorSource, view: ModulatorSourceView) {
    source.index = view.index;
    source.curveType = view.curveType;
    source.isCC = view.isCC;
    source.isBipolar = view.isBipolar;
    source.isNegative = view.isNegative;
}

function buildModulator(view: ModulatorView) {
    // Core does not export the source's constructor, so the modulator's own sources are filled in
    const modulator = new Modulator();
    applySource(modulator.primarySource, view.primarySource);
    applySource(modulator.secondarySource, view.secondarySource);
    modulator.destination = view.destination;
    modulator.transformAmount = view.transformAmount;
    modulator.transformType = view.transformType;
    return modulator;
}

function buildRange(view: RangeView | undefined) {
    return view ? { min: view.min, max: view.max } : { ...UNSET_RANGE };
}

function applyZone(zone: BasicZone, view: ZoneView) {
    zone.keyRange = buildRange(view.keyRange);
    zone.velRange = buildRange(view.velocityRange);
    zone.generators = view.generators.map(
        (g) => new Generator(g.type, g.value, false)
    );
    zone.modulators = view.modulators.map((m) => buildModulator(m));
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

    // Removed elements stay in these maps, so an undo that brings one back finds it with its data
    private readonly presets = new Map<number, BasicPreset>();
    private readonly instruments = new Map<number, BasicInstrument>();
    private readonly samples = new Map<number, BasicSample>();
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
            bank.samples.length === ids.samples.length;
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
        }
    }

    private applySamples(diff: ElementDiff<SampleView>) {
        for (const view of diff.changed) {
            if (!this.samples.has(view.id)) {
                this.samples.set(
                    view.id,
                    new BasicSample(
                        view.name,
                        view.sampleRate,
                        view.originalKey,
                        view.pitchCorrection,
                        SampleTypes.monoSample,
                        view.loopStart,
                        view.loopEnd
                    )
                );
            }
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
                applyZone(instrument.globalZone, view.globalZone);
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
                applyZone(instrument.createZone(sample), zoneView);
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
                applyZone(preset.globalZone, view.globalZone);
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
                applyZone(preset.createZone(instrument), zoneView);
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
        this.applySamples(views.samples);
        for (const [id, stored] of patch.sampleData) {
            getOrThrow(this.samples, id, "sample").setStoredData(stored);
        }
        // Presets first, so a removed preset lets go of its instruments before they are removed
        this.applyPresetRemovals(views.presets);
        this.applyInstruments(views.instruments);
        this.applyPresets(views.presets);
        if (views.defaultModulators) {
            this.bank.defaultModulators = views.defaultModulators.map((m) =>
                buildModulator(m)
            );
        }
        if (patch.info) {
            this.bank.soundBankInfo = { ...patch.info };
        }
    }

    public getSample(id: number) {
        return this.samples.get(id);
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
