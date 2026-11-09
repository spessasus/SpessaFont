import { useTranslation } from "react-i18next";
import "../../phone_shell/octave_strip.css";
import type { MinimapSegment } from "../../phone_shell/zone_minimap_math.ts";
import { getNoteName } from "../../keyboard/keyboard/piano_keys.ts";

// Every other C, then the last key, so the labels fit a phone's width
const OCTAVE_LABELS = [0, 24, 48, 72, 96, 127];

interface KeySpanBarProps {
    segments: readonly MinimapSegment[];
    low: number;
    high: number;
}

/**
 * The zones along the 128 keys, like the drawer's minimap, with the typed span drawn over them.
 * Display only, the span is typed.
 */
export function KeySpanBar({ segments, low, high }: KeySpanBarProps) {
    const { t } = useTranslation();
    const from = Math.min(low, high);
    const to = Math.max(low, high);
    return (
        <div className={"key_span_bar"}>
            <div
                className={"key_span_bar_track"}
                role={"img"}
                aria-label={t("phoneLocale.cellSheet.keySpanLabel", {
                    low: getNoteName(from),
                    high: getNoteName(to)
                })}
            >
                {segments.map((segment, index) => (
                    <div
                        // Segments follow the zone columns, which are positional
                        key={index}
                        className={"zone_minimap_segment"}
                        data-color={segment.color}
                        style={{
                            "--start": segment.start,
                            "--span": segment.end - segment.start + 1
                        }}
                    />
                ))}
                <div
                    className={"zone_minimap_window"}
                    style={{ "--start": from, "--span": to - from + 1 }}
                />
            </div>
            <div className={"key_span_bar_labels"} aria-hidden={true}>
                {OCTAVE_LABELS.map((key) => (
                    <span
                        key={key}
                        className={"key_span_bar_label"}
                        style={{ "--start": key }}
                    >
                        {getNoteName(key)}
                    </span>
                ))}
            </div>
        </div>
    );
}
