import { MIDIPatchTools } from "spessasynth_core";
import type {
    BankViews,
    RangeView,
    ZoneView
} from "../../core_backend/entity_views.ts";
import type { MirrorTarget } from "../../synth_host/bank_mirror.ts";

/**
 * SF2 and SF3 keep 20 characters of a name (SFE and DLS keep more).
 */
export const SF2_NAME_LENGTH = 20;

const LATIN_1_MAX = 0xff;

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
    | { kind: "nonLatin1Name"; target: MirrorTarget };

function isOutsideLatin1(text: string) {
    for (const char of text) {
        if ((char.codePointAt(0) ?? 0) > LATIN_1_MAX) {
            return true;
        }
    }
    return false;
}

function isSameRange(a: RangeView | undefined, b: RangeView | undefined) {
    return a?.min === b?.min && a?.max === b?.max;
}

function isSameGenerators(a: ZoneView, b: ZoneView) {
    return (
        a.generators.length === b.generators.length &&
        a.generators.every(
            (g, i) =>
                g.type === b.generators[i].type &&
                g.value === b.generators[i].value
        )
    );
}

/**
 * The first zone that repeats an earlier one: the same child, ranges and generators, which plays
 * the child twice the same way. A detuned copy (a chorus) differs in its generators.
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
                    isSameGenerators(earlier, zone)
            )
    );
}

function checkNames(issues: BankIssue[], target: MirrorTarget, name: string) {
    if (name.length > SF2_NAME_LENGTH) {
        issues.push({ kind: "longName", target });
    }
    if (isOutsideLatin1(name)) {
        issues.push({ kind: "nonLatin1Name", target });
    }
}

/**
 * Lists the issues of a bank, from its views. Fast enough to run on every render of the panel.
 */
export function checkBank(views: BankViews): BankIssue[] {
    const issues = new Array<BankIssue>();

    const byPatch = new Map<string, number[]>();
    for (const id of views.presetOrder) {
        const preset = views.presets.get(id);
        if (!preset) {
            continue;
        }
        const target: MirrorTarget = { kind: "preset", id };
        const patch = MIDIPatchTools.toMIDIString(preset);
        byPatch.set(patch, [...(byPatch.get(patch) ?? []), id]);
        if (preset.zones.length === 0) {
            issues.push({ kind: "emptyElement", target });
        }
        const duplicate = findDuplicateZone(preset.zones);
        if (duplicate?.childId !== undefined) {
            issues.push({
                kind: "duplicateZone",
                target,
                zoneName: views.instruments.get(duplicate.childId)?.name ?? ""
            });
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
        if (instrument.usedBy.length === 0) {
            issues.push({ kind: "unusedInstrument", instrumentId: id });
        }
        if (instrument.zones.length === 0) {
            issues.push({ kind: "emptyElement", target });
        }
        const duplicate = findDuplicateZone(instrument.zones);
        if (duplicate?.childId !== undefined) {
            issues.push({
                kind: "duplicateZone",
                target,
                zoneName: views.samples.get(duplicate.childId)?.name ?? ""
            });
        }
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
        // A stereo half that is used counts its partner as used too
        const isPartnerUsed = (partner?.usedBy.length ?? 0) > 0;
        if (!isPartnerUsed && sample.usedBy.length === 0) {
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
