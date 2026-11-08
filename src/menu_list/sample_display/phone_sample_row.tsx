import "./sample_display_phone.css";
import { useTranslation } from "react-i18next";
import { SpeakerIcon } from "../../utils/icons/player_icons.tsx";
import { SampleDisplay, type SampleDisplayProps } from "./sample_display.tsx";

interface PhoneSampleRowProps extends SampleDisplayProps {
    /**
     * Auditions the sample, the phone's replacement for the double click.
     */
    onPlay: () => void;
}

/**
 * A sample row with its own play button, since a double click is hard to hit on a touch screen.
 * The button sits beside the row's button, not inside it.
 */
export function PhoneSampleRow({ onPlay, ...rowProps }: PhoneSampleRowProps) {
    const { t } = useTranslation();
    return (
        <div className={"phone_sample_row"}>
            <button
                type={"button"}
                className={"plain_button phone_sample_play"}
                aria-label={t("sampleLocale.tools.play")}
                onClick={onPlay}
            >
                <SpeakerIcon />
            </button>
            <SampleDisplay {...rowProps} />
        </div>
    );
}
