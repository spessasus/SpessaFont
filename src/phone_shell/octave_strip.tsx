import { useTranslation } from "react-i18next";
import "./octave_strip.css";
import {
    ChevronLeftIcon,
    ChevronRightIcon
} from "../utils/icons/app_icons.tsx";
import { ZoneMinimap } from "./zone_minimap.tsx";
import type { MinimapSegment } from "./zone_minimap_math.ts";

interface OctaveStripProps {
    /**
     * The phone keyboard to scroll. Null while it is not shown.
     */
    keyboard: HTMLDivElement | null;
    segments: readonly MinimapSegment[];
}

/**
 * The strip over the phone keys: octave buttons around the zone minimap.
 */
export function OctaveStrip({ keyboard, segments }: OctaveStripProps) {
    const { t } = useTranslation();

    // An octave is seven white keys, and the 128 keys share the scroll width
    const scrollByOctave = (direction: -1 | 1) => {
        if (!keyboard) {
            return;
        }
        keyboard.scrollBy({
            left: (direction * 12 * keyboard.scrollWidth) / 128,
            behavior: "smooth"
        });
    };

    return (
        <>
            <button
                type={"button"}
                className={"plain_button octave_button"}
                aria-label={t("phoneLocale.drawer.octaveDown")}
                onClick={() => scrollByOctave(-1)}
            >
                <ChevronLeftIcon />
            </button>
            <ZoneMinimap keyboard={keyboard} segments={segments} />
            <button
                type={"button"}
                className={"plain_button octave_button"}
                aria-label={t("phoneLocale.drawer.octaveUp")}
                onClick={() => scrollByOctave(1)}
            >
                <ChevronRightIcon />
            </button>
        </>
    );
}
