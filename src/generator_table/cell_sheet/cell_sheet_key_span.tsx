import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnKeyRange, parseKeyText } from "../zone_finder.ts";
import { getZoneColorNumber } from "../zone_color.ts";
import { getNoteName } from "../../keyboard/keyboard/piano_keys.ts";
import { findColumnsInSpan } from "./cell_sheet_keys.ts";
import { KeySpanBar } from "./key_span_bar.tsx";
import { useBackHandler } from "../../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../../phone_shell/back_stack.ts";

interface CellSheetKeySpanProps {
    /**
     * The row's columns, Global included, which the span checks.
     */
    columns: readonly ZoneColumn[];
    /**
     * The grid's zone columns, for the zone colors on the bar.
     */
    colorColumns: readonly ZoneColumn[];
    globalZone: ZoneView;
    initialSpan: { low: number; high: number } | undefined;
    onCheck: (ids: ReadonlySet<number>, isAdding: boolean) => void;
    onBack: () => void;
}

const DEFAULT_SPAN = { low: 48, high: 72 };

interface KeyFieldProps {
    label: string;
    text: string;
    onText: (text: string) => void;
}

/**
 * A key typed as a MIDI number or a note name, with the note name it reads as after it.
 */
function KeyField({ label, text, onText }: KeyFieldProps) {
    const id = useId();
    const key = parseKeyText(text);
    return (
        <div className={"cell_sheet_key_field"}>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                className={"pretty_input cell_sheet_key_input"}
                inputMode={"text"}
                autoComplete={"off"}
                value={text}
                aria-invalid={key === undefined}
                onChange={(e) => onText(e.target.value)}
            />
            <span className={"cell_sheet_key_note monospaced"}>
                {key === undefined ? "" : getNoteName(key)}
            </span>
        </div>
    );
}

/**
 * The cell sheet's Keys… view: check every zone whose key range overlaps a typed span.
 */
export function CellSheetKeySpan({
    columns,
    colorColumns,
    globalZone,
    initialSpan,
    onCheck,
    onBack
}: CellSheetKeySpanProps) {
    const { t } = useTranslation();
    // Back returns to the zone list before it closes the sheet
    useBackHandler(true, BACK_LEVELS.transient, () => {
        onBack();
        return true;
    });
    const start = initialSpan ?? DEFAULT_SPAN;
    const [lowText, setLowText] = useState(String(start.low));
    const [highText, setHighText] = useState(String(start.high));
    // A field that does not read as a key keeps the last one that did
    const [span, setSpan] = useState(start);
    const found = findColumnsInSpan(columns, globalZone, span.low, span.high);
    const segments = colorColumns.map((column, index) => {
        const { min, max } = getColumnKeyRange(column, globalZone);
        return { start: min, end: max, color: getZoneColorNumber(index) };
    });

    return (
        <div className={"cell_sheet_key_span"}>
            <p className={"cell_sheet_key_hint"}>
                {t("phoneLocale.cellSheet.keySpanHint")}
            </p>
            <div className={"cell_sheet_key_fields"}>
                <KeyField
                    label={t("phoneLocale.cellSheet.low")}
                    text={lowText}
                    onText={(text) => {
                        setLowText(text);
                        const key = parseKeyText(text);
                        if (key !== undefined) {
                            setSpan((previous) => ({ ...previous, low: key }));
                        }
                    }}
                />
                <KeyField
                    label={t("phoneLocale.cellSheet.high")}
                    text={highText}
                    onText={(text) => {
                        setHighText(text);
                        const key = parseKeyText(text);
                        if (key !== undefined) {
                            setSpan((previous) => ({ ...previous, high: key }));
                        }
                    }}
                />
            </div>
            <KeySpanBar segments={segments} low={span.low} high={span.high} />
            <p className={"cell_sheet_key_found"}>
                {t("phoneLocale.cellSheet.spanZones", {
                    count: found.length,
                    names: found.map((c) => c.name).join(", ")
                })}
            </p>
            <div className={"cell_sheet_key_buttons"}>
                <button
                    type={"button"}
                    className={"pretty_button cell_sheet_button"}
                    onClick={onBack}
                >
                    {t("phoneLocale.cellSheet.back")}
                </button>
                <button
                    type={"button"}
                    className={"pretty_button cell_sheet_button"}
                    onClick={() =>
                        onCheck(new Set(found.map((c) => c.zone.id)), true)
                    }
                >
                    {t("phoneLocale.cellSheet.addToChecked")}
                </button>
                <button
                    type={"button"}
                    className={
                        "pretty_button cell_sheet_button cell_sheet_apply"
                    }
                    onClick={() =>
                        onCheck(new Set(found.map((c) => c.zone.id)), false)
                    }
                >
                    {t("phoneLocale.cellSheet.checkThem")}
                </button>
            </div>
        </div>
    );
}
