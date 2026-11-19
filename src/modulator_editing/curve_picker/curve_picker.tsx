import "./curve_picker.css";
import { type RefObject, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEventListener } from "../../hooks/use_event_listener.ts";
import type { CustomCurveView } from "../../core_backend/entity_views.ts";
import { CurveChooser } from "./curve_chooser.tsx";
import { CurvePicture } from "./curve_picture.tsx";
import { getCurveLabel } from "./curve_label.ts";
import { curveKey } from "./curve_shape.ts";
import { StandardCurves } from "./standard_curves.tsx";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import { CurveSheet } from "./curve_sheet.tsx";
import { useLayout } from "../../layout/layout_context.ts";
import { Presence } from "../../presence/presence.tsx";

const PICK_CLASS =
    "plain_button modulator_curve_pick pretty_outline responsive_button";

interface CurveOptionsProps {
    label: string;
    current: SpessaFontModulatorCurveType;
    isSFe: boolean;
    customCurves: readonly CustomCurveView[];
    /**
     * The whole picker, toggle included. A press outside of it closes the options.
     */
    pickerRef: RefObject<HTMLDivElement | null>;
    onPick: (c: SpessaFontModulatorCurveType) => void;
    onChange: (c: SpessaFontModulatorCurveType) => void;
    onClose: () => void;
}

/**
 * Mounted only while the picker is open, so a closed picker does not listen to the document.
 */
function CurveOptions({
    label,
    current,
    isSFe,
    customCurves,
    pickerRef,
    onPick,
    onChange,
    onClose
}: CurveOptionsProps) {
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
            {isSFe ? (
                <CurveChooser
                    current={current}
                    customCurves={customCurves}
                    gridClassName="modulator_curve_grid"
                    pickClassName={PICK_CLASS}
                    onPick={onPick}
                    onChange={onChange}
                />
            ) : (
                <StandardCurves
                    currentKey={curveKey(current)}
                    pickClassName={PICK_CLASS}
                    onPick={onPick}
                />
            )}
        </div>
    );
}

interface CurvePickerProps {
    /**
     * Names the picker for screen readers, for example "Primary source curve".
     */
    label: string;
    curveType: SpessaFontModulatorCurveType;
    /**
     * SFe mode also offers the bank's custom curves.
     */
    isSFe: boolean;
    customCurves: readonly CustomCurveView[];
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
    isSFe,
    customCurves,
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
                            current={curveType}
                            isSFe={isSFe}
                            customCurves={customCurves}
                            onPick={handlePick}
                            onChange={onChange}
                            onClose={() => onOpenChange(false)}
                        />
                    ) : (
                        <CurveOptions
                            label={label}
                            current={curveType}
                            isSFe={isSFe}
                            customCurves={customCurves}
                            pickerRef={pickerRef}
                            onPick={handlePick}
                            onChange={onChange}
                            // A press outside keeps the focus where it went
                            onClose={() => onOpenChange(false)}
                        />
                    )
                ) : null}
            </Presence>
        </div>
    );
}
