import { useTranslation } from "react-i18next";
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
import { useDialogs } from "../dialogs/dialogs_context.ts";
import { getStereoBaseName } from "../utils/stereo_regex.ts";
import { isLoopShared } from "./sample_audio.ts";

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
 * Setters for the sample's properties. Each one rounds and clamps the value, applies it as an
 * action (to both halves of a stereo pair where that makes sense), and returns the applied
 * value for the input to show. They read the sample when called, render reads its view.
 * @param sample the edited sample, which the actions change
 * @param view its view, for the length (the editor's sample has no data)
 */
export function useSampleEdits(sample: BasicSample, view: SampleView) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { pickElement } = useDialogs();
    const lookup = useEntityLookup(session.store);
    const { length } = view;

    /**
     * @param fitPartner the value for the other half of a stereo pair, if it needs its own
     * (loop points have to fit the partner's length)
     */
    const changeProperty = <K extends EditableSampleProperty>(
        property: K,
        value: BasicSample[K],
        fitPartner?: (partner: BasicSample) => BasicSample[K]
    ) => {
        if (value === sample[property]) {
            return value;
        }
        const linkedSample = sample.linkedSample;
        const actions = [
            new EditSampleAction(sample, property, sample[property], value)
        ];
        const partnerValue =
            linkedSample && fitPartner ? fitPartner(linkedSample) : value;
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

    const setLoopPoint = (property: "loopStart" | "loopEnd", value: number) => {
        const point = Math.round(value);
        // A loop point stays on its side of the other one and inside the sample
        const fit = (s: BasicSample, sampleLength: number) =>
            property === "loopStart"
                ? clamp(point, 0, Math.min(s.loopEnd, sampleLength - 1))
                : clamp(point, Math.max(s.loopStart, 0), sampleLength);
        return changeProperty(property, fit(sample, length), (partner) =>
            isLoopShared(sample, partner)
                ? fit(partner, session.getSampleLength(partner))
                : partner[property]
        );
    };

    /**
     * Asks for the other half of a stereo pair, the samples whose name matches first, and links
     * it. Without a type, a stereo half keeps its side and another sample takes the side its
     * name ends with.
     */
    const pickLinkedSample = async (type?: SampleType) => {
        // Read when asked, the editor does not re-render for every sample of the bank
        const { views } = session.store.getSnapshot();
        const free = views.sampleOrder.flatMap((id) => {
            const other = views.samples.get(id);
            return other &&
                id !== view.id &&
                id !== view.linkedSampleId &&
                (other.linkedSampleId === undefined ||
                    other.linkedSampleId === view.id)
                ? [other]
                : [];
        });
        const matches = free.filter(
            (other) => getStereoBaseName(other.name, view.name) !== other.name
        );
        const picked = await pickElement({
            title: t("sampleLocale.pickPartner"),
            items: [
                ...matches,
                ...free.filter((other) => !matches.includes(other))
            ],
            getLabel: (other) => other.name
        });
        const partner = picked && lookup.sample(picked.id);
        if (!partner) {
            return;
        }
        const isStereoHalf =
            sample.sampleType === SampleTypes.leftSample ||
            sample.sampleType === SampleTypes.rightSample;
        const nameSide = /r\)?$/i.test(sample.name.trim())
            ? SampleTypes.rightSample
            : SampleTypes.leftSample;
        apply([
            new SetSampleTypeAction(sample, {
                linkedSample: partner,
                type: type ?? (isStereoHalf ? sample.sampleType : nameSide)
            })
        ]);
    };

    return {
        setName,
        setLoopStart: (start: number) => setLoopPoint("loopStart", start),
        setLoopEnd: (end: number) => setLoopPoint("loopEnd", end),
        setSampleRate: (rate: number) =>
            changeProperty(
                "sampleRate",
                clamp(Math.round(rate), MIN_SAMPLE_RATE, MAX_SAMPLE_RATE)
            ),
        setOriginalKey: (key: number) =>
            changeProperty("originalKey", clamp(Math.round(key), 0, 127)),
        setCentCorrection: (cents: number) =>
            changeProperty(
                "pitchCorrection",
                clamp(Math.round(cents), -99, 99)
            ),
        /**
         * Changes the type. A sample that is not a stereo half yet asks for its partner first.
         */
        setType: (type: SampleType) => {
            const partner = sample.linkedSample;
            if (
                type !== SampleTypes.leftSample &&
                type !== SampleTypes.rightSample
            ) {
                apply([
                    new SetSampleTypeAction(sample, {
                        linkedSample: undefined,
                        type
                    })
                ]);
            } else if (partner) {
                apply([
                    new SetSampleTypeAction(sample, {
                        linkedSample: partner,
                        type
                    })
                ]);
            } else {
                void pickLinkedSample(type);
            }
        },
        pickLinkedSample: () => void pickLinkedSample()
    };
}
