import { useContext, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../../fancy_inputs/segmented_control/segmented_control.tsx";
import { getNoteName } from "../../keyboard/keyboard/piano_keys.ts";
import { PlusMinusIcon } from "../../utils/icons/app_icons.tsx";
import { buildRangeText } from "./cell_sheet_text.ts";
import { PianoCaptureBar } from "../../phone_shell/piano_capture_bar.tsx";
import { openKeysForCapture } from "../../phone_shell/open_keys_for_capture.ts";
import { PhoneShellContext } from "../../phone_shell/phone_shell_context.ts";
import { PianoKeysIcon } from "../../utils/icons/player_icons.tsx";

interface CellSheetRangeEditorProps {
    isKeyRange: boolean;
    /**
     * The checked cells' shared range, undefined when they differ and the fields start empty.
     */
    initialRange: { low: number; high: number } | undefined;
    mode: "set" | "shift";
    onModeChange: (mode: "set" | "shift") => void;
    /**
     * The sheet runs a piano capture of its own, which ends this one: one capture at a time.
     */
    isPianoBusy: boolean;
    /**
     * Called when this editor starts a capture, so the sheet ends its own.
     */
    onCaptureStart: () => void;
    /**
     * Nothing is checked, so Apply does nothing.
     */
    isDisabled: boolean;
    /**
     * The status line's start, "2 of 5 checked".
     */
    status: string;
    /**
     * The buttons before Apply.
     */
    footer: ReactNode;
    /**
     * Applies the text to the checked cells. False when the cells refused it.
     */
    onApply: (text: string) => boolean;
}

function readNote(text: string) {
    const trimmed = text.trim();
    if (!/^\d{1,3}$/.test(trimmed)) {
        return undefined;
    }
    const value = Number(trimmed);
    return value <= 127 ? value : undefined;
}

/**
 * The cell sheet's editor for key and velocity range rows: set Low and High, or shift both
 * ends. The fields start with the checked cells' range, empty when they differ.
 */
export function CellSheetRangeEditor({
    isKeyRange,
    initialRange,
    mode,
    onModeChange,
    isPianoBusy,
    onCaptureStart,
    isDisabled,
    status,
    footer,
    onApply
}: CellSheetRangeEditorProps) {
    const { t } = useTranslation();
    const [low, setLow] = useState(
        initialRange ? String(initialRange.low) : ""
    );
    const [high, setHigh] = useState(
        initialRange ? String(initialRange.high) : ""
    );
    const [shift, setShift] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);
    if (isCapturing && isPianoBusy) {
        setIsCapturing(false);
    }
    // Not usePhoneShell, which throws where the editor renders without the shell (its tests)
    const shell = useContext(PhoneShellContext);
    const lowValue = readNote(low);
    const highValue = readNote(high);
    const trimmedShift = shift.trim().replace(/^\+/, "");
    const shiftValue = /^-?\d{1,3}$/.test(trimmedShift)
        ? Number(trimmedShift)
        : undefined;
    let text: string | undefined;
    if (mode === "set") {
        if (lowValue !== undefined && highValue !== undefined) {
            text = buildRangeText({
                kind: "set",
                low: lowValue,
                high: highValue
            });
        }
    } else if (shiftValue !== undefined) {
        text = buildRangeText({ kind: "shift", by: shiftValue });
    }
    const canApply = !isDisabled && text !== undefined;

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canApply || text === undefined || !onApply(text)) {
            return;
        }
        if (mode === "shift") {
            setShift("");
        }
        // Closes the soft keyboard
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    const renderField = (
        label: string,
        value: string,
        parsed: number | undefined,
        onChange: (value: string) => void
    ) => (
        <label className={"cell_sheet_range_field"}>
            <span className={"cell_sheet_range_label"}>{label}</span>
            <span className={"cell_sheet_field"}>
                <input
                    className={"cell_sheet_input"}
                    inputMode={"numeric"}
                    enterKeyHint={"done"}
                    autoComplete={"off"}
                    aria-invalid={value !== "" && parsed === undefined}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                {isKeyRange && parsed !== undefined ? (
                    <span className={"cell_sheet_field_unit monospaced"}>
                        {getNoteName(parsed)}
                    </span>
                ) : null}
            </span>
        </label>
    );

    return (
        <form className={"cell_sheet_editor"} onSubmit={handleSubmit}>
            {isCapturing ? (
                <PianoCaptureBar
                    count={2}
                    prompt={t("phoneLocale.capture.playLowHigh")}
                    onDone={([first, second]) => {
                        setIsCapturing(false);
                        // Fills the fields only, Apply stays the user's step
                        setLow(String(Math.min(first, second)));
                        setHigh(String(Math.max(first, second)));
                    }}
                    onCancel={() => setIsCapturing(false)}
                />
            ) : null}
            <div className={"cell_sheet_editor_row"}>
                <SegmentedControl
                    label={t("phoneLocale.cellSheet.mode")}
                    options={[
                        { value: "set", label: t("phoneLocale.cellSheet.set") },
                        {
                            value: "shift",
                            label: t("phoneLocale.cellSheet.shift")
                        }
                    ]}
                    value={mode}
                    onChange={(next) => {
                        // Shift has no Low and High to fill
                        setIsCapturing(false);
                        onModeChange(next);
                    }}
                />
                {/* Two played keys make a key span, so velocity ranges have no button */}
                {isKeyRange && mode === "set" ? (
                    <button
                        type={"button"}
                        className={
                            "pretty_button cell_sheet_text_button cell_sheet_piano cell_sheet_piano_labelled"
                        }
                        aria-pressed={isCapturing}
                        onClick={() => {
                            // Only a start shows the keys, a cancel leaves the drawer
                            if (shell && !isCapturing) {
                                openKeysForCapture(
                                    shell.state.drawer,
                                    shell.dispatch
                                );
                            }
                            if (!isCapturing) {
                                onCaptureStart();
                            }
                            setIsCapturing(!isCapturing);
                        }}
                    >
                        <PianoKeysIcon />
                        {/* Spelled out, as the zone row's play-two-keys has the same icon */}
                        <span>{t("phoneLocale.cellSheet.setFromPiano")}</span>
                    </button>
                ) : null}
            </div>
            <div className={"cell_sheet_editor_row"}>
                {mode === "set" ? (
                    <>
                        {renderField(
                            t("phoneLocale.cellSheet.low"),
                            low,
                            lowValue,
                            setLow
                        )}
                        {renderField(
                            t("phoneLocale.cellSheet.high"),
                            high,
                            highValue,
                            setHigh
                        )}
                    </>
                ) : (
                    <div className={"cell_sheet_field"}>
                        <button
                            type={"button"}
                            className={"plain_button cell_sheet_sign"}
                            aria-label={t("phoneLocale.cellSheet.sign")}
                            onClick={() =>
                                setShift(
                                    shift.startsWith("-")
                                        ? shift.slice(1)
                                        : `-${shift}`
                                )
                            }
                        >
                            <PlusMinusIcon />
                        </button>
                        <input
                            className={"cell_sheet_input"}
                            inputMode={"numeric"}
                            enterKeyHint={"done"}
                            autoComplete={"off"}
                            aria-label={t("phoneLocale.cellSheet.shift")}
                            value={shift}
                            onChange={(event) => setShift(event.target.value)}
                        />
                    </div>
                )}
            </div>
            <p className={"cell_sheet_status"}>
                <span>{status}</span>
                {text === undefined ? null : (
                    <span className={"cell_sheet_sends"}>
                        {t("phoneLocale.cellSheet.sends", { text })}
                    </span>
                )}
            </p>
            <div className={"cell_sheet_footer"}>
                {footer}
                <button
                    type={"submit"}
                    className={
                        "pretty_button cell_sheet_button cell_sheet_apply"
                    }
                    aria-disabled={!canApply}
                >
                    {t("phoneLocale.cellSheet.apply")}
                </button>
            </div>
        </form>
    );
}
