import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToolDialog } from "../../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../../dialogs/dialog_number_field.tsx";
import { DialogSelectField } from "../../dialogs/dialog_select_field.tsx";
import { readNumberField } from "../../dialogs/read_number_field.ts";
import {
    type AttenuationStats,
    limitAttenuationOffset
} from "./attenuation_actions.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";

const LIMIT = 1000;
const identity = (v: number) => v;

interface AttenuationDialogProps {
    stats: AttenuationStats;
    /**
     * The attenuation row of the table, so the dialog shows dB the way the table does.
     */
    row: GeneratorRowType;
    /**
     * Answers with the offset in centibels, already limited to the range, and whether the
     * limit made it smaller than asked.
     */
    onAnswer: (
        answer: { offset: number; isReduced: boolean } | undefined
    ) => void;
}

/**
 * Asks how far to move the attenuation of the selection: to a new lowest value, or by an offset.
 */
export function AttenuationDialog({
    stats,
    row,
    onAnswer
}: AttenuationDialogProps) {
    const { t } = useTranslation();
    const { fromGenerator = identity, toGenerator = identity } = row;
    // Offsets are differences, which the linear conversion keeps
    const format = (raw: number) =>
        (fromGenerator(raw) - fromGenerator(0)).toFixed(row.precision ?? 0);
    const [mode, setMode] = useState<"lowest" | "add">("lowest");
    const [lowestText, setLowestText] = useState(format(stats.lowest));
    const [offsetText, setOffsetText] = useState("0");

    const typed = readNumberField(
        mode === "lowest" ? lowestText : offsetText,
        -LIMIT,
        LIMIT
    );
    const typedRaw =
        typed === undefined ? undefined : toGenerator(typed) - toGenerator(0);
    const wanted =
        typedRaw === undefined || mode === "add"
            ? typedRaw
            : typedRaw - stats.lowest;
    const offset =
        wanted === undefined
            ? undefined
            : limitAttenuationOffset(stats, wanted);
    const isReduced =
        wanted !== undefined &&
        offset !== undefined &&
        Math.abs(offset - wanted) >= 1;

    return (
        <ToolDialog
            title={t("toolsLocale.attenuation.title")}
            canApply={offset !== undefined && offset !== 0}
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (offset !== undefined) {
                    onAnswer({ offset, isReduced });
                }
            }}
        >
            <p className={"tool_dialog_note"}>
                {t("toolsLocale.attenuation.current", {
                    lowest: format(stats.lowest),
                    highest: format(stats.highest)
                })}
            </p>
            <DialogSelectField
                label={t("toolsLocale.attenuation.mode")}
                value={mode}
                options={[
                    {
                        value: "lowest",
                        label: t("toolsLocale.attenuation.setLowest")
                    },
                    { value: "add", label: t("toolsLocale.attenuation.add") }
                ]}
                onChange={setMode}
            />
            {mode === "lowest" ? (
                <DialogNumberField
                    label={t("toolsLocale.attenuation.lowest")}
                    value={lowestText}
                    min={-LIMIT}
                    max={LIMIT}
                    step={0.5}
                    onChange={setLowestText}
                />
            ) : (
                <DialogNumberField
                    label={t("toolsLocale.attenuation.offset")}
                    value={offsetText}
                    min={-LIMIT}
                    max={LIMIT}
                    step={0.5}
                    onChange={setOffsetText}
                />
            )}
            {offset === undefined ? null : (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.attenuation.preview", {
                        offset: format(offset),
                        lowest: format(stats.lowest + offset),
                        highest: format(stats.highest + offset)
                    })}
                </p>
            )}
            {isReduced ? (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.attenuation.reduced")}
                </p>
            ) : null}
        </ToolDialog>
    );
}
