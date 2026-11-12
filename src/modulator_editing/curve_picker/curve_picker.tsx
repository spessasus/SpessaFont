import "./curve_picker.css";
import { type RefObject, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEventListener } from "../../hooks/use_event_listener.ts";
import { CurvePicture } from "./curve_picture.tsx";
import { getCurveLabel } from "./curve_label.ts";
import { ALL_CURVE_TYPES, curveKey } from "./curve_shape.ts";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import { CurveSheet } from "./curve_sheet.tsx";
import { useLayout } from "../../layout/layout_context.ts";
import { Presence } from "../../presence/presence.tsx";

interface CurveOptionsProps {
    label: string;
    currentKey: string;
    /**
     * The whole picker, toggle included. A press outside of it closes the options.
     */
    pickerRef: RefObject<HTMLDivElement | null>;
    onPick: (c: SpessaFontModulatorCurveType) => void;
    onClose: () => void;
}

/**
 * Mounted only while the picker is open, so a closed picker does not listen to the document.
 */
function CurveOptions({
    label,
    currentKey,
    pickerRef,
    onPick,
    onClose
}: CurveOptionsProps) {
    const { t } = useTranslation();
    useEventListener(document, "pointerdown", (e) => {
        if (
            e.target instanceof Node &&
            !pickerRef.current?.contains(e.target)
        ) {
            onClose();
        }
    });
    return (
        <div
            className="modulator_curve_showcase pretty_outline"
            role={"group"}
            aria-label={label}
        >
            {ALL_CURVE_TYPES.map((c) => {
                const key = curveKey(c);
                const curveLabel = getCurveLabel(t, c);
                return (
                    <button
                        type={"button"}
                        key={key}
                        aria-pressed={key === currentKey}
                        aria-label={curveLabel}
                        title={curveLabel}
                        className={`plain_button modulator_curve_pick pretty_outline responsive_button ${key === currentKey ? "selected" : ""}`}
                        onClick={() => onPick(c)}
                    >
                        <CurvePicture curve={c} />
                    </button>
                );
            })}
        </div>
    );
}

interface CurvePickerProps {
    /**
     * Names the picker for screen readers, for example "Primary source curve".
     */
    label: string;
    curveType: SpessaFontModulatorCurveType;
    onChange: (c: SpessaFontModulatorCurveType) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

/**
 * A toggle that opens the curve options below it. Picking one or pressing Escape closes them
 * and returns the focus to the toggle, as the focused option goes away.
 */
export function CurvePicker({
    label,
    curveType,
    onChange,
    isOpen,
    onOpenChange
}: CurvePickerProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const pickerRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const currentKey = curveKey(curveType);
    const buttonLabel = `${label}: ${getCurveLabel(t, curveType)}`;

    const close = () => {
        onOpenChange(false);
        toggleRef.current?.focus();
    };

    const handlePick = (c: SpessaFontModulatorCurveType) => {
        close();
        // Picking the current curve only closes the options
        if (curveKey(c) !== currentKey) {
            onChange(c);
        }
    };

    return (
        <div
            className="modulator_curve_picker"
            ref={pickerRef}
            onKeyDown={(e) => {
                if (!isOpen || e.key !== "Escape") {
                    return;
                }
                e.stopPropagation();
                close();
            }}
        >
            <button
                type={"button"}
                ref={toggleRef}
                className={`plain_button pretty_outline responsive_button ${isOpen ? "" : "hover_brightness"}`}
                aria-expanded={isOpen}
                aria-label={buttonLabel}
                title={buttonLabel}
                onClick={() => onOpenChange(!isOpen)}
            >
                <CurvePicture curve={curveType} />
            </button>
            <Presence>
                {isOpen ? (
                    layout === "phone" ? (
                        <CurveSheet
                            label={label}
                            currentKey={currentKey}
                            onPick={handlePick}
                            onClose={() => onOpenChange(false)}
                        />
                    ) : (
                        <CurveOptions
                            label={label}
                            currentKey={currentKey}
                            pickerRef={pickerRef}
                            onPick={handlePick}
                            // A press outside keeps the focus where it went
                            onClose={() => onOpenChange(false)}
                        />
                    )
                ) : null}
            </Presence>
        </div>
    );
}
