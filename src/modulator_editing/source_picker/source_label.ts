import { ModulatorControllerSources } from "spessasynth_core";
import type { TFunction } from "i18next";
import { isLinkSource } from "../linked_modulator.ts";
import type { SelectOption } from "../../utils/translated_options/translated_options.ts";
import {
    NON_CC_SOURCES,
    type SpessaFontModulatorSource
} from "./source_option_value.ts";

export const NON_CC_SOURCE_LABELS = {
    [ModulatorControllerSources.noController]:
        "modulatorLocale.sources.noController",
    [ModulatorControllerSources.noteOnVelocity]:
        "modulatorLocale.sources.velocity",
    [ModulatorControllerSources.noteOnKeyNum]:
        "modulatorLocale.sources.midiNote",
    [ModulatorControllerSources.polyPressure]:
        "modulatorLocale.sources.polyPressure",
    [ModulatorControllerSources.channelPressure]:
        "modulatorLocale.sources.channelPressure",
    [ModulatorControllerSources.pitchWheel]:
        "modulatorLocale.sources.pitchWheel",
    [ModulatorControllerSources.pitchWheelRange]:
        "modulatorLocale.sources.pitchWheelRange"
} as const;

/**
 * The label the source picker shows for a source, also for one the lists do not offer (a
 * modulator link, an illegal CC).
 */
export function getSourceLabel(
    { usesCC, sourceIndex }: SpessaFontModulatorSource,
    controllers: readonly SelectOption[],
    t: TFunction
) {
    if (usesCC) {
        return (
            controllers.find((c) => c.value === sourceIndex)?.label ??
            t("modulatorLocale.sources.otherController", {
                number: sourceIndex
            })
        );
    }
    const listed = NON_CC_SOURCES.find((s) => s === sourceIndex);
    if (listed !== undefined) {
        return t(NON_CC_SOURCE_LABELS[listed]);
    }
    return isLinkSource({ isCC: false, index: sourceIndex })
        ? t("modulatorLocale.sources.link")
        : t("modulatorLocale.sources.otherSource", { number: sourceIndex });
}
