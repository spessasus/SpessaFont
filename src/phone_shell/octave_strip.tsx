import { useTranslation } from "react-i18next";
import "./octave_strip.css";
import {
    ChevronLeftIcon,
    ChevronRightIcon
} from "../utils/icons/app_icons.tsx";
import type { KeySplit } from "../utils/zone_splits.ts";
import { ZoneMinimap } from "./zone_minimap.tsx";

interface OctaveStripProps {
    /**
     * The phone keyboard to scroll. Null while it is not shown.
     */
    keyboard: HTMLDivElement | null;
    splits: readonly KeySplit[] | undefined;
}

/**
 * The strip over the phone keys: octave buttons around the zone minimap.
 */
export function OctaveStrip({ keyboard, splits }: OctaveStripProps) {
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
            <ZoneMinimap keyboard={keyboard} splits={splits} />
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
