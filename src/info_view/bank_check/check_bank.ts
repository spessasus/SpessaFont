import { MIDIPatchTools, type SoundBankInfoData } from "spessasynth_core";
import type {
    BankViews,
    RangeView,
    ZoneView
} from "../../core_backend/entity_views.ts";
import type { MirrorTarget } from "../../synth_host/bank_mirror.ts";
import { findUnusedIds } from "../../core_backend/bank_maintenance.ts";
import {
    hasInfoTextOutsideLatin1,
    isOutsideLatin1
} from "../../core_backend/latin1_text.ts";
import { isBankNumberLostInSF2 } from "../../core_backend/sf2_bank_numbers.ts";
import { hasZoneSFEData, isSFEGenerator } from "../../core_backend/sfe_data.ts";
import { isSameModulator } from "../../modulator_editing/same_modulator.ts";
import { isLinkedModulator } from "../../modulator_editing/linked_modulator.ts";

/**
 * SF2 and SF3 keep 20 characters of a name for other players. SpessaSynth reads 20 more from
 * the extra chunk that SF2, SF3 and SFE saves write, and DLS keeps the whole name.
 */
export const SF2_NAME_LENGTH = 20;
export const EXTENDED_NAME_LENGTH = 40;

/**
 * Something in the bank that is likely a mistake, or that a save cannot keep.
 */
export type BankIssue =
    | {
          kind: "duplicatePatch";
          /**
           * The presets that share the patch, in bank order.
           */
          presetIds: readonly number[];
          patch: string;
      }
    | { kind: "duplicateZone"; target: MirrorTarget; zoneName: string }
    | { kind: "emptyElement"; target: MirrorTarget }
    | { kind: "unusedInstrument"; instrumentId: number }
    | { kind: "unusedSample"; sampleId: number }
    | { kind: "loopOutside"; sampleId: number }
    | {
          kind: "stereoMismatch";
          sampleId: number;
          partnerId: number;
          reason: "rate" | "length" | "oneSided";
      }
    | { kind: "longName"; target: MirrorTarget }
    | { kind: "cutName"; target: MirrorTarget }
    | { kind: "nonLatin1Name"; target: MirrorTarget }
    | { kind: "nonLatin1Info" }
    | { kind: "bankNumberLost"; presetId: number }
    | { kind: "sfeOnlyData"; target: MirrorTarget }
    | { kind: "sfeDefaultModulators" }
    | { kind: "linkedModulator"; target: MirrorTarget };

/**
 * A zone without a range of its own plays every key or velocity.
 */
const FULL_RANGE: RangeView = { min: 0, max: 127 };

/**
 * The loop "fix the loop" sets: a reversed loop is turned around and the end is kept inside the
 * sample. A loop that would be empty after that (it lay past the end) covers the whole sample.
 */
export function getFixedLoop(
    loopStart: number,
    loopEnd: number,
    length: number
) {
    const end = Math.min(Math.max(loopStart, loopEnd), length);
    const start = Math.min(loopStart, loopEnd, end);
    return start < end ? { start, end } : { start: 0, end: length };
}

function isSameRange(a: RangeView | undefined, b: RangeView | undefined) {
    const rangeA = a ?? FULL_RANGE;
    const rangeB = b ?? FULL_RANGE;
    return rangeA.min === rangeB.min && rangeA.max === rangeB.max;
}

/**
 * The order of the generators does not change how a zone plays.
 */
function isSameGenerators(a: ZoneView, b: ZoneView) {
    const values = new Map(a.generators.map((g) => [g.type, g.value]));
    return (
        a.generators.length === b.generators.length &&
        b.generators.every((g) => values.get(g.type) === g.value)
    );
}

function isSameModulators(a: ZoneView, b: ZoneView) {
    return (
        a.modulators.length === b.modulators.length &&
        a.modulators.every((mod) =>
            b.modulators.some((other) => isSameModulator(mod, other, true))
        )
    );
}

/**
 * The first zone that repeats an earlier one: the same child, ranges, generators and modulators,
 * which plays the child twice the same way. A detuned copy (a chorus) differs in its generators.
 */
function findDuplicateZone(zones: readonly ZoneView[]) {
    return zones.find((zone, i) =>
        zones
            .slice(0, i)
            .some(
                (earlier) =>
                    earlier.childId === zone.childId &&
                    isSameRange(earlier.keyRange, zone.keyRange) &&
                    isSameRange(earlier.velocityRange, zone.velocityRange) &&
                    isSameGenerators(earlier, zone) &&
                    isSameModulators(earlier, zone)
            )
    );
}

function checkNames(issues: BankIssue[], target: MirrorTarget, name: string) {
    if (name.length > EXTENDED_NAME_LENGTH) {
        issues.push({ kind: "cutName", target });
    } else if (name.length > SF2_NAME_LENGTH) {
        issues.push({ kind: "longName", target });
    }
    if (isOutsideLatin1(name)) {
        issues.push({ kind: "nonLatin1Name", target });
    }
}

/**
 * The checks a preset and an instrument share: zones, data only SFE keeps, linked modulators.
 */
function checkZones(
    issues: BankIssue[],
    target: MirrorTarget,
    element: {
        readonly globalZone: ZoneView;
        readonly zones: readonly ZoneView[];
    },
    getChildName: (id: number) => string
) {
    if (element.zones.length === 0) {
        issues.push({ kind: "emptyElement", target });
    }
    const duplicate = findDuplicateZone(element.zones);
    if (duplicate?.childId !== undefined) {
        issues.push({
            kind: "duplicateZone",
            target,
            zoneName: getChildName(duplicate.childId)
        });
    }
    const zones = [element.globalZone, ...element.zones];
    if (zones.some((zone) => hasZoneSFEData(zone))) {
        issues.push({ kind: "sfeOnlyData", target });
    }
    if (
        zones.some((zone) => zone.modulators.some((m) => isLinkedModulator(m)))
    ) {
        issues.push({ kind: "linkedModulator", target });
    }
}

/**
 * Lists the issues of a bank, from its views and info. Fast enough to run on every render of
 * the overview.
 */
export function checkBank(
    views: BankViews,
    info: Readonly<SoundBankInfoData>
): BankIssue[] {
    const issues = new Array<BankIssue>();
    const unused = findUnusedIds(views);

    if (hasInfoTextOutsideLatin1(info)) {
        issues.push({ kind: "nonLatin1Info" });
    }
    if (views.defaultModulators.some((m) => isSFEGenerator(m.destination))) {
        issues.push({ kind: "sfeDefaultModulators" });
    }

    const byPatch = new Map<string, number[]>();
    for (const id of views.presetOrder) {
        const preset = views.presets.get(id);
        if (!preset) {
            continue;
        }
        const target: MirrorTarget = { kind: "preset", id };
        const patch = MIDIPatchTools.toMIDIString(preset);
        byPatch.set(patch, [...(byPatch.get(patch) ?? []), id]);
        checkZones(
            issues,
            target,
            preset,
            (childId) => views.instruments.get(childId)?.name ?? ""
        );
        if (isBankNumberLostInSF2(preset)) {
            issues.push({ kind: "bankNumberLost", presetId: id });
        }
        checkNames(issues, target, preset.name);
    }
    for (const [patch, presetIds] of byPatch) {
        if (presetIds.length > 1) {
            issues.push({ kind: "duplicatePatch", presetIds, patch });
        }
    }

    for (const id of views.instrumentOrder) {
        const instrument = views.instruments.get(id);
        if (!instrument) {
            continue;
        }
        const target: MirrorTarget = { kind: "instrument", id };
        if (unused.instruments.has(id)) {
            issues.push({ kind: "unusedInstrument", instrumentId: id });
        }
        checkZones(
            issues,
            target,
            instrument,
            (childId) => views.samples.get(childId)?.name ?? ""
        );
        checkNames(issues, target, instrument.name);
    }

    for (const id of views.sampleOrder) {
        const sample = views.samples.get(id);
        if (!sample) {
            continue;
        }
        const partner =
            sample.linkedSampleId === undefined
                ? undefined
                : views.samples.get(sample.linkedSampleId);
        if (unused.samples.has(id)) {
            issues.push({ kind: "unusedSample", sampleId: id });
        }
        if (
            sample.length > 0 &&
            (sample.loopEnd > sample.length ||
                sample.loopStart > sample.loopEnd)
        ) {
            issues.push({ kind: "loopOutside", sampleId: id });
        }
        // Each pair is reported once, from its first sample
        if (partner && (id < partner.id || partner.linkedSampleId !== id)) {
            let reason: "rate" | "length" | "oneSided" | undefined;
            if (partner.linkedSampleId !== id) {
                reason = "oneSided";
            } else if (partner.sampleRate !== sample.sampleRate) {
                reason = "rate";
            } else if (partner.length !== sample.length) {
                reason = "length";
            }
            if (reason) {
                issues.push({
                    kind: "stereoMismatch",
                    sampleId: id,
                    partnerId: partner.id,
                    reason
                });
            }
        }
        checkNames(issues, { kind: "sample", id }, sample.name);
    }
    return issues;
}
