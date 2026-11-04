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

export const MIN_SAMPLE_RATE = 8000;
export const MAX_SAMPLE_RATE = 192_000;
/**
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

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

    const changeProperty = <K extends EditableSampleProperty>(
        property: K,
        value: BasicSample[K]
    ) => {
        if (value === sample[property]) {
            return value;
        }
        const linkedSample = sample.linkedSample;
        const actions = [
            new EditSampleAction(sample, property, sample[property], value)
        ];
        if (linkedSample) {
            actions.push(
                new EditSampleAction(
                    linkedSample,
                    property,
                    linkedSample[property],
                    value
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
        let base = name.slice(0, MAX_BASE_NAME_LENGTH);
        if (base.endsWith("R") || base.endsWith("L")) {
            base = base.slice(0, -1);
        }
        if (!linkedSample) {
            apply([new EditSampleAction(sample, "name", sample.name, base)]);
            return base;
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
        setLoopStart: (start: number) =>
            changeProperty(
                "loopStart",
                clamp(start, 0, Math.min(sample.loopEnd, length - 1))
            ),
        setLoopEnd: (end: number) =>
            changeProperty(
                "loopEnd",
                clamp(end, Math.max(sample.loopStart, 0), length)
            ),
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
