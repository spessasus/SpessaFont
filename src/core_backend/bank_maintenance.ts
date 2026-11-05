import {
    type BasicInstrument,
    type BasicSample,
    type SampleType,
    SampleTypes
} from "spessasynth_core";
import type { BankDocument } from "./bank_document.ts";
import type { BankViews } from "./entity_views.ts";
import type { HistoryAction } from "./history.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { SetSampleTypeAction } from "../sample_editor/set_sample_type_action.ts";

/**
 * Maps the stereo marker at the end of a sample name
 * to the marker of its pair and the type of the sample itself.
 */
const STEREO_MARKERS = new Map<
    string,
    { pairMarker: string; type: SampleType }
>([
    ["l", { pairMarker: "r", type: SampleTypes.leftSample }],
    ["L", { pairMarker: "R", type: SampleTypes.leftSample }],
    ["r", { pairMarker: "l", type: SampleTypes.rightSample }],
    ["R", { pairMarker: "L", type: SampleTypes.rightSample }]
]);

interface UsageAccess<I, S> {
    isInstrumentUsed: (instrument: I) => boolean;
    /**
     * The instruments that use the sample, one entry per zone.
     */
    getSampleUsers: (sample: S) => readonly I[];
    getPartner: (sample: S) => S | undefined;
}

/**
 * What "remove unused" removes: the instruments no preset uses, then the samples that no
 * remaining instrument uses. A stereo half whose partner stays used stays too, as deleting it
 * would turn the partner into a mono sample. The "Unused" list filter and the bank check use
 * the same rule, through the views.
 */
function findUnused<I, S>(
    instruments: readonly I[],
    samples: readonly S[],
    access: UsageAccess<I, S>
) {
    const unusedInstruments = new Set(
        instruments.filter((i) => !access.isInstrumentUsed(i))
    );
    const isSampleUsed = (sample: S) =>
        access.getSampleUsers(sample).some((i) => !unusedInstruments.has(i));
    const unusedSamples = new Set(
        samples.filter((sample) => {
            const partner = access.getPartner(sample);
            return (
                !isSampleUsed(sample) &&
                (partner === undefined || !isSampleUsed(partner))
            );
        })
    );
    return { instruments: unusedInstruments, samples: unusedSamples };
}

/**
 * The ids of the instruments and samples "remove unused" would remove, from the views.
 */
export function findUnusedIds(views: BankViews) {
    return findUnused(views.instrumentOrder, views.sampleOrder, {
        isInstrumentUsed: (id) =>
            (views.instruments.get(id)?.usedBy.length ?? 0) > 0,
        getSampleUsers: (id) => views.samples.get(id)?.usedBy ?? [],
        getPartner: (id) => views.samples.get(id)?.linkedSampleId
    });
}

/**
 * Builds the actions that delete every instrument no preset uses,
 * then every sample no remaining instrument uses (see `findUnused`).
 */
export function createRemoveUnusedActions(document: BankDocument) {
    const unused = findUnused<BasicInstrument, BasicSample>(
        document.instruments,
        document.samples,
        {
            isInstrumentUsed: (instrument) => instrument.useCount > 0,
            getSampleUsers: (sample) => sample.linkedTo,
            getPartner: (sample) => sample.linkedSample
        }
    );

    // Instruments go first, as deleting them unlinks the samples
    const actions: HistoryAction[] = [
        ...Array.from(unused.instruments, (i) => new DeleteInstrumentAction(i)),
        ...Array.from(unused.samples, (s) => new DeleteSampleAction(s))
    ];
    return {
        actions,
        instrumentCount: unused.instruments.size,
        sampleCount: unused.samples.size
    };
}

/**
 * Builds the actions that link unlinked samples into stereo pairs
 * when their names differ only in a trailing L/R marker.
 */
export function createAutoLinkActions(samples: readonly BasicSample[]) {
    const actions = new Array<SetSampleTypeAction>();
    const linkedSamples = new Set<BasicSample>();
    for (const sample of samples) {
        if (sample.linkedSample || linkedSamples.has(sample)) {
            continue;
        }

        const match = /[a-zA-Z!](?=\s*$|\)|$)/.exec(sample.name)?.[0];
        const marker =
            match === undefined ? undefined : STEREO_MARKERS.get(match);
        if (!marker) {
            continue;
        }
        const { pairMarker, type } = marker;
        const linkedName = sample.name.replace(
            /([a-zA-Z!])(?!.*[a-zA-Z!])/,
            () => pairMarker
        );
        const linkedSample = samples.find(
            (s) =>
                s.name === linkedName &&
                !linkedSamples.has(s) &&
                !s.linkedSample
        );
        if (!linkedSample) {
            continue;
        }

        linkedSamples.add(sample);
        linkedSamples.add(linkedSample);
        actions.push(new SetSampleTypeAction(sample, { linkedSample, type }));
    }
    return actions;
}
