import { useTranslation } from "react-i18next";
import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
import { OptionList } from "../utils/translated_options/option_list.tsx";
import { useTranslatedOptions } from "../utils/translated_options/translated_options_context.ts";

interface DestinationPickerProps {
    destination: GeneratorType;
    onChange: (d: GeneratorType) => void;
}

export function DestinationPicker({
    destination,
    onChange
}: DestinationPickerProps) {
    const { t } = useTranslation();
    const { destinations } = useTranslatedOptions();
    return (
        <select
            className={"pretty_outline destination_picker monospaced"}
            aria-label={t("modulatorLocale.destination")}
            value={destination}
            onChange={(e) =>
                onChange(
                    (Number.parseInt(e.target.value) as GeneratorType) ||
                        GeneratorTypes.initialAttenuation
                )
            }
        >
            <OptionList options={destinations} />
        </select>
    );
}
