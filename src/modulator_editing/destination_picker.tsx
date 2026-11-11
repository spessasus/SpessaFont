import { useTranslation } from "react-i18next";
import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
import { OptionList } from "../utils/translated_options/option_list.tsx";
import { useTranslatedOptions } from "../utils/translated_options/translated_options_context.ts";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { isLinkDestination } from "./linked_modulator.ts";
import { isSFEGenerator } from "../core_backend/sfe_data.ts";

const GENERATOR_TYPES = new Set<number>(Object.values(GeneratorTypes));

function isGeneratorType(value: number): value is GeneratorType {
    return GENERATOR_TYPES.has(value);
}

interface DestinationPickerProps {
    destination: GeneratorType;
    onChange: (d: GeneratorType) => void;
    /**
     * SF2 mode leaves out the SFE destinations.
     */
    isSFE: boolean;
}

export function DestinationPicker({
    destination,
    onChange,
    isSFE
}: DestinationPickerProps) {
    const { t } = useTranslation();
    const { destinations: allDestinations } = useTranslatedOptions();
    const destinations = isSFE
        ? allDestinations
        : allDestinations.filter((d) => !isSFEGenerator(d.value));
    // A destination the list does not offer still shows as itself, not as the first option
    const isListed = destinations.some((d) => d.value === destination);
    const unlistedKey = generatorLocaleMap[destination];
    let unlistedLabel = "";
    if (!isListed) {
        unlistedLabel = isLinkDestination(destination)
            ? t("modulatorLocale.linkDestination")
            : unlistedKey === undefined
              ? t("modulatorLocale.otherDestination", {
                    number: destination
                })
              : t(unlistedKey);
    }
    return (
        <select
            className={"pretty_outline destination_picker monospaced"}
            aria-label={t("modulatorLocale.destination")}
            value={destination}
            onChange={(e) => {
                const value = Number(e.target.value);
                if (isGeneratorType(value)) {
                    onChange(value);
                }
            }}
        >
            {isListed ? null : (
                <option value={destination}>{unlistedLabel}</option>
            )}
            <OptionList options={destinations} />
        </select>
    );
}
