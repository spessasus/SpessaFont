import type {
    BasicInstrument,
    BasicInstrumentZone,
    BasicPreset,
    BasicPresetZone,
    BasicSample,
    BasicSoundBank,
    BasicZone,
    GeneratorType,
    Modulator,
    ModulatorCurveType,
    ModulatorSource,
    ModulatorSourceIndex,
    ModulatorTransformType,
    SampleType
} from "spessasynth_core";
import { getObjectId } from "../utils/object_id.ts";
import type { BankEntity } from "./bank_view.ts";
import type { ElementList } from "./change_set.ts";

/*
 * Bank views are frozen plain copies of the bank's elements for rendering. A view is replaced
 * exactly when its data changed, so its identity can be compared like React state. Elements
 * refer to their children by id, so a sample rename changes only the sample's view.
 * They are structured-cloneable, so the same objects can go to the synthesizer thread.
 */

export interface RangeView {
    readonly min: number;
    readonly max: number;
}

export interface ModulatorSourceView {
    readonly index: ModulatorSourceIndex;
    readonly isCC: boolean;
    readonly isBipolar: boolean;
    readonly isNegative: boolean;
    readonly curveType: ModulatorCurveType;
}

export interface ModulatorView {
    readonly id: number;
    readonly primarySource: ModulatorSourceView;
    readonly secondarySource: ModulatorSourceView;
    readonly destination: GeneratorType;
    readonly transformAmount: number;
    readonly transformType: ModulatorTransformType;
}

export interface GeneratorView {
    readonly type: GeneratorType;
    readonly value: number;
}

export interface ZoneView {
    readonly id: number;
    /**
     * Undefined when the zone has no range of its own.
     */
    readonly keyRange: RangeView | undefined;
    readonly velocityRange: RangeView | undefined;
    /**
     * The generators the zone sets, in the zone's order, which a saved file keeps.
     */
    readonly generators: readonly GeneratorView[];
    readonly modulators: readonly ModulatorView[];
    /**
     * The instrument of a preset zone or the sample of an instrument zone. Undefined for a
     * global zone.
     */
    readonly childId: number | undefined;
}

export interface PresetView {
    readonly id: number;
    readonly name: string;
    readonly program: number;
    readonly bankMSB: number;
    readonly bankLSB: number;
    readonly isGMGSDrum: boolean;
    /**
     * GM/GS drums, or an XG drum bank.
     */
    readonly isDrum: boolean;
    /**
     * Unused SF2 header fields, kept so a copy of the bank writes the same file.
     */
    readonly library: number;
    readonly genre: number;
    readonly morphology: number;
    readonly globalZone: ZoneView;
    readonly zones: readonly ZoneView[];
}

export interface InstrumentView {
    readonly id: number;
    readonly name: string;
    readonly globalZone: ZoneView;
    readonly zones: readonly ZoneView[];
    /**
     * The presets that use the instrument, one entry per zone.
     */
    readonly usedBy: readonly number[];
}

export interface SampleView {
    readonly id: number;
    readonly name: string;
    readonly sampleRate: number;
    readonly originalKey: number;
    readonly pitchCorrection: number;
    readonly loopStart: number;
    readonly loopEnd: number;
    readonly type: SampleType;
    readonly linkedSampleId: number | undefined;
    /**
     * In sample frames, known without decoding.
     */
    readonly length: number;
    readonly isCompressed: boolean;
    /**
     * The instruments that use the sample, one entry per zone.
     */
    readonly usedBy: readonly number[];
    /**
     * Changes when the sample's audio data changes.
     */
    readonly audioRevision: number;
}

export interface BankViews {
    readonly presetOrder: readonly number[];
    readonly instrumentOrder: readonly number[];
    readonly sampleOrder: readonly number[];
    readonly presets: ReadonlyMap<number, PresetView>;
    readonly instruments: ReadonlyMap<number, InstrumentView>;
    readonly samples: ReadonlyMap<number, SampleView>;
    readonly defaultModulators: readonly ModulatorView[];
}

/**
 * What changed since the previous views. The same fields as `ChangeSet`.
 */
export interface ViewChanges {
    readonly entities: ReadonlySet<BankEntity>;
    readonly lists: ReadonlySet<ElementList>;
    readonly hasBankInfoChanged: boolean;
}

/**
 * Looks up the audio revision of a sample, which only the store knows.
 */
export type AudioRevisionLookup = (sample: BasicSample) => number;

function buildRange(range: { min: number; max: number }, isSet: boolean) {
    return isSet ? { min: range.min, max: range.max } : undefined;
}

function buildSource(source: ModulatorSource): ModulatorSourceView {
    return {
        index: source.index,
        isCC: source.isCC,
        isBipolar: source.isBipolar,
        isNegative: source.isNegative,
        curveType: source.curveType
    };
}

export function buildModulatorView(modulator: Modulator): ModulatorView {
    return {
        id: getObjectId(modulator),
        primarySource: buildSource(modulator.primarySource),
        secondarySource: buildSource(modulator.secondarySource),
        destination: modulator.destination,
        transformAmount: modulator.transformAmount,
        transformType: modulator.transformType
    };
}

function buildZoneView(zone: BasicZone, child?: object): ZoneView {
    return {
        id: getObjectId(zone),
        keyRange: buildRange(zone.keyRange, zone.hasKeyRange),
        velocityRange: buildRange(zone.velRange, zone.hasVelRange),
        generators: zone.generators.map((g) => ({
            type: g.type,
            value: g.value
        })),
        modulators: zone.modulators.map((m) => buildModulatorView(m)),
        childId: child ? getObjectId(child) : undefined
    };
}

export function buildPresetView(preset: BasicPreset): PresetView {
    return {
        id: getObjectId(preset),
        name: preset.name,
        program: preset.program,
        bankMSB: preset.bankMSB,
        bankLSB: preset.bankLSB,
        isGMGSDrum: preset.isGMGSDrum,
        isDrum: preset.isDrum,
        library: preset.library,
        genre: preset.genre,
        morphology: preset.morphology,
        globalZone: buildZoneView(preset.globalZone),
        zones: preset.zones.map((z: BasicPresetZone) =>
            buildZoneView(z, z.instrument)
        )
    };
}

export function buildInstrumentView(
    instrument: BasicInstrument
): InstrumentView {
    return {
        id: getObjectId(instrument),
        name: instrument.name,
        globalZone: buildZoneView(instrument.globalZone),
        zones: instrument.zones.map((z: BasicInstrumentZone) =>
            buildZoneView(z, z.sample)
        ),
        usedBy: instrument.linkedTo.map((p) => getObjectId(p))
    };
}

export function buildSampleView(
    sample: BasicSample,
    audioRevision: number
): SampleView {
    return {
        id: getObjectId(sample),
        name: sample.name,
        sampleRate: sample.sampleRate,
        originalKey: sample.originalKey,
        pitchCorrection: sample.pitchCorrection,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd,
        type: sample.sampleType,
        linkedSampleId: sample.linkedSample
            ? getObjectId(sample.linkedSample)
            : undefined,
        length: sample.sampleLength,
        isCompressed: sample.isCompressed,
        usedBy: sample.linkedTo.map((i) => getObjectId(i)),
        audioRevision
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getId(value: unknown) {
    return isRecord(value) && typeof value.id === "number"
        ? value.id
        : undefined;
}

/**
 * Returns `previous` where it equals `next`, deeply, so unchanged parts keep their identity.
 * Array items with an `id` are matched by it, so inserting a zone keeps the zones after it.
 */
function reuseValue(previous: unknown, next: unknown): unknown {
    if (Object.is(previous, next)) {
        return previous;
    }
    if (Array.isArray(previous) && Array.isArray(next)) {
        const byId = new Map<number, unknown>();
        for (const item of previous) {
            const id = getId(item);
            if (id !== undefined) {
                byId.set(id, item);
            }
        }
        const items = next.map((item, i) => {
            const id = getId(item);
            const match: unknown =
                id === undefined ? previous[i] : byId.get(id);
            return reuseValue(match, item);
        });
        const isSame =
            items.length === previous.length &&
            items.every((item, i) => item === previous[i]);
        return isSame ? previous : items;
    }
    if (isRecord(previous) && isRecord(next)) {
        const result: Record<string, unknown> = {};
        let isSame = Object.keys(previous).length === Object.keys(next).length;
        for (const [key, value] of Object.entries(next)) {
            result[key] = reuseValue(previous[key], value);
            isSame &&=
                Object.hasOwn(previous, key) && result[key] === previous[key];
        }
        return isSame ? previous : result;
    }
    return next;
}

/**
 * Freezes the new parts of a view in development, so a write to a view throws in tests and the
 * dev build. Reused parts are frozen already, so their subtrees are skipped.
 */
function freezeNew(value: unknown) {
    if (
        typeof value !== "object" ||
        value === null ||
        !import.meta.env.DEV ||
        Object.isFrozen(value)
    ) {
        return;
    }
    for (const child of Object.values(value)) {
        freezeNew(child);
    }
    Object.freeze(value);
}

/**
 * The typed entry to `reuseValue`. `reuseValue` returns either `previous` or a structural copy
 * of `next`, both of type T, which TypeScript cannot follow through the recursion.
 */
function reuse<T>(previous: T | undefined, next: T) {
    const result = reuseValue(previous, next) as T;
    freezeNew(result);
    return result;
}

/**
 * Ids of the children an element's view points to.
 */
function getChildIds(view: PresetView | InstrumentView | undefined) {
    return view?.zones.map((z) => z.childId) ?? [];
}

/**
 * Maps the ids of a list to its elements, built on first use.
 */
function createIndex<E extends BankEntity>(elements: readonly E[]) {
    let index: Map<number, E> | undefined;
    return () => {
        index ??= new Map(elements.map((e) => [getObjectId(e), e]));
        return index;
    };
}

interface ListUpdate<E extends BankEntity, V extends { id: number }> {
    elements: readonly E[];
    getIndex: () => ReadonlyMap<number, E>;
    previousOrder: readonly number[] | undefined;
    previousViews: ReadonlyMap<number, V> | undefined;
    isListTouched: boolean;
    touched: ReadonlySet<BankEntity>;
    build: (element: E) => V;
    /**
     * Called with the old and the new view of each element whose view was replaced, added
     * (no old view) or removed (no new view), so the caller can rebuild what depends on it.
     */
    onChanged: (previous: V | undefined, next: V | undefined) => void;
}

/**
 * Updates the views of one element list. Touched elements (and new ones) are rebuilt, removed
 * ones dropped, and the rest keep their views.
 */
function updateList<E extends BankEntity, V extends { id: number }>({
    elements,
    getIndex,
    previousOrder,
    previousViews,
    isListTouched,
    touched,
    build,
    onChanged
}: ListUpdate<E, V>) {
    let changedViews: Map<number, V> | undefined;
    const write = (id: number, view: V | undefined) => {
        changedViews ??= new Map(previousViews);
        if (view) {
            changedViews.set(id, view);
        } else {
            changedViews.delete(id);
        }
    };

    let order = previousOrder;
    if (!previousOrder || isListTouched) {
        const nextOrder = elements.map((e) => getObjectId(e));
        order = reuse(previousOrder, nextOrder);
        const index = getIndex();
        const oldViews = previousViews ?? new Map<number, V>();
        for (const [id, view] of oldViews) {
            if (index.has(id)) {
                continue;
            }
            write(id, undefined);
            onChanged(view, undefined);
        }
        for (const [id, element] of index) {
            if (oldViews.has(id) || touched.has(element)) {
                continue;
            }
            const view = reuse(undefined, build(element));
            write(id, view);
            onChanged(undefined, view);
        }
    }
    for (const entity of touched) {
        const id = getObjectId(entity);
        // The touched set holds every kind, and an element the same group removed again
        const element = getIndex().get(id);
        if (element !== entity) {
            continue;
        }
        const previous = previousViews?.get(id);
        const view = reuse(previous, build(element));
        if (view === previous) {
            continue;
        }
        write(id, view);
        onChanged(previous, view);
    }
    return {
        order: order ?? [],
        views: changedViews ?? previousViews ?? new Map<number, V>()
    };
}

/**
 * Builds the bank's views, reusing `previous` for everything the changes did not touch.
 * Without previous views (or changes), everything is built.
 *
 * Elements point down to their children, but the children list who uses them, so an element
 * whose zones changed also rebuilds its old and new children. A sample rebuilds its old and new
 * stereo partner the same way. Actions only have to touch what they edited.
 */
export function updateBankViews(
    bank: BasicSoundBank,
    getAudioRevision: AudioRevisionLookup,
    previous?: BankViews,
    changes?: ViewChanges
): BankViews {
    const lists = changes?.lists ?? new Set<ElementList>();
    const touched = new Set(changes?.entities);
    const getPresetIndex = createIndex(bank.presets);
    const getInstrumentIndex = createIndex(bank.instruments);
    const getSampleIndex = createIndex(bank.samples);
    const touchByIds = <C extends BankEntity>(
        target: Set<BankEntity>,
        index: ReadonlyMap<number, C>,
        ids: readonly (number | undefined)[]
    ) => {
        for (const id of ids) {
            const child = id === undefined ? undefined : index.get(id);
            if (child) {
                target.add(child);
            }
        }
    };
    const buildSample = (s: BasicSample) =>
        buildSampleView(s, getAudioRevision(s));

    const presets = updateList({
        elements: bank.presets,
        getIndex: getPresetIndex,
        previousOrder: previous?.presetOrder,
        previousViews: previous?.presets,
        isListTouched: lists.has("presets"),
        touched,
        build: buildPresetView,
        onChanged: (old, next) =>
            touchByIds(touched, getInstrumentIndex(), [
                ...getChildIds(old),
                ...getChildIds(next)
            ])
    });
    const instruments = updateList({
        elements: bank.instruments,
        getIndex: getInstrumentIndex,
        previousOrder: previous?.instrumentOrder,
        previousViews: previous?.instruments,
        isListTouched: lists.has("instruments"),
        touched,
        build: buildInstrumentView,
        onChanged: (old, next) =>
            touchByIds(touched, getSampleIndex(), [
                ...getChildIds(old),
                ...getChildIds(next)
            ])
    });
    // The partners are rebuilt in a second pass, the first one may have passed them already
    const partners = new Set<BankEntity>();
    const firstSamples = updateList({
        elements: bank.samples,
        getIndex: getSampleIndex,
        previousOrder: previous?.sampleOrder,
        previousViews: previous?.samples,
        isListTouched: lists.has("samples"),
        touched,
        build: buildSample,
        onChanged: (old, next) =>
            touchByIds(partners, getSampleIndex(), [
                old?.linkedSampleId,
                next?.linkedSampleId
            ])
    });
    for (const sample of touched) {
        partners.delete(sample);
    }
    const samples =
        partners.size > 0
            ? updateList({
                  elements: bank.samples,
                  getIndex: getSampleIndex,
                  previousOrder: firstSamples.order,
                  previousViews: firstSamples.views,
                  isListTouched: false,
                  touched: partners,
                  build: buildSample,
                  onChanged: () => {
                      // The partner of a partner is a sample the first pass rebuilt
                  }
              })
            : firstSamples;

    const defaultModulators =
        !previous || changes?.hasBankInfoChanged
            ? reuse(
                  previous?.defaultModulators,
                  bank.defaultModulators.map((m) => buildModulatorView(m))
              )
            : previous.defaultModulators;

    const next: BankViews = {
        presetOrder: presets.order,
        instrumentOrder: instruments.order,
        sampleOrder: samples.order,
        presets: presets.views,
        instruments: instruments.views,
        samples: samples.views,
        defaultModulators
    };
    if (
        previous &&
        (Object.keys(next) as (keyof BankViews)[]).every(
            (key) => next[key] === previous[key]
        )
    ) {
        return previous;
    }
    freezeNew(next);
    return next;
}
