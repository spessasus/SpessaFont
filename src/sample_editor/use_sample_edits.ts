import {
    type BasicSample,
    type SampleType,
    SampleTypes
} from "spessasynth_core";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import {
    EditSampleAction,
    type EditableSampleProperty
} from "./edit_sample_action.ts";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import type { SampleView } from "../core_backend/entity_views.ts";
import { useEntityLookup } from "../hooks/use_entity_lookup.ts";
import { clamp } from "../generator_table/generator_range.ts";

export const MIN_SAMPLE_RATE = 8000;
export const MAX_SAMPLE_RATE = 192_000;
/**
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

/**
 * The suffix of a stereo half: "R" for the right sample, "L" for the left one.
 */
function getStereoSuffix(type: SampleType) {
    if (type === SampleTypes.rightSample) return "R";
    if (type === SampleTypes.leftSample) return "L";
    return "";
}

/**
 * Setters for the sample's properties. Each one clamps the value, applies it as an action
 * (to both halves of a stereo pair where that makes sense), and returns the applied value
 * for the input to show. They read the sample when called, render reads its view.
 * @param sample the edited sample, which the actions change
 * @param view its view, for the length (the editor's sample has no data)
 */
export function useSampleEdits(sample: BasicSample, view: SampleView) {
    const { session, apply } = useBankEditor();
    const lookup = useEntityLookup(session.store);
    const { length } = view;

    /**
     * @param fitPartner the value for the other half of a stereo pair, if it needs its own
     * (loop points have to fit the partner's length)
     */
    const changeProperty = <K extends EditableSampleProperty>(
        property: K,
        value: BasicSample[K],
        fitPartner: (partner: BasicSample) => BasicSample[K] = () => value
    ) => {
        if (value === sample[property]) {
            return value;
        }
        const linkedSample = sample.linkedSample;
        const actions = [
            new EditSampleAction(sample, property, sample[property], value)
        ];
        const partnerValue = linkedSample ? fitPartner(linkedSample) : value;
        if (linkedSample && partnerValue !== linkedSample[property]) {
            actions.push(
                new EditSampleAction(
                    linkedSample,
                    property,
                    linkedSample[property],
                    partnerValue
                )
            );
        }
        apply(actions);
        return value;
    };

    const setName = (name: string) => {
        if (name === sample.name) {
            return name;
        }
        const linkedSample = sample.linkedSample;
        // A mono sample keeps its name as typed ("BELL" stays "BELL")
        if (!linkedSample) {
            const mono = name.slice(0, MAX_BASE_NAME_LENGTH + 1);
            apply([new EditSampleAction(sample, "name", sample.name, mono)]);
            return mono;
        }
        let base = name.slice(0, MAX_BASE_NAME_LENGTH);
        if (base.endsWith("R") || base.endsWith("L")) {
            base = base.slice(0, -1);
        }
        // Both halves of a stereo pair keep the same name with their own suffix
        const newName = base + getStereoSuffix(sample.sampleType);
        apply([
            new EditSampleAction(sample, "name", sample.name, newName),
            new EditSampleAction(
                linkedSample,
                "name",
                linkedSample.name,
                base + getStereoSuffix(linkedSample.sampleType)
            )
        ]);
        return newName;
    };

    return {
        setName,
        setLoopStart: (start: number) => {
            const fit = (s: BasicSample, sampleLength: number) =>
                clamp(start, 0, Math.min(s.loopEnd, sampleLength - 1));
            return changeProperty("loopStart", fit(sample, length), (p) =>
                fit(p, session.getSampleLength(p))
            );
        },
        setLoopEnd: (end: number) => {
            const fit = (s: BasicSample, sampleLength: number) =>
                clamp(end, Math.max(s.loopStart, 0), sampleLength);
            return changeProperty("loopEnd", fit(sample, length), (p) =>
                fit(p, session.getSampleLength(p))
            );
        },
        setSampleRate: (rate: number) =>
            changeProperty(
                "sampleRate",
                clamp(rate, MIN_SAMPLE_RATE, MAX_SAMPLE_RATE)
            ),
        setOriginalKey: (key: number) =>
            changeProperty("originalKey", clamp(Math.floor(key), 0, 127)),
        setCentCorrection: (cents: number) =>
            changeProperty(
                "pitchCorrection",
                clamp(Math.floor(cents), -99, 99)
            ),
        /**
         * Links the sample as a stereo half, or makes it mono without a sample.
         * The action adjusts the other sample of the pair too.
         */
        setLinkedSample: (type: SampleType, otherId?: number) =>
            apply([
                new SetSampleTypeAction(sample, {
                    linkedSample:
                        otherId === undefined
                            ? undefined
                            : lookup.sample(otherId),
                    type
                })
            ])
    };
}
