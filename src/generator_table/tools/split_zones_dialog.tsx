import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToolDialog } from "../../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../../dialogs/dialog_number_field.tsx";
import { DialogSelectField } from "../../dialogs/dialog_select_field.tsx";
import { readNumberField } from "../../dialogs/read_number_field.ts";
import type { SplitMode, ZoneSplit } from "./split_zones_action.ts";

interface SplitZonesDialogProps {
    initialMode: SplitMode;
    onAnswer: (split: ZoneSplit | undefined) => void;
}

/**
 * Asks whether to split zones by key or by velocity, and how wide each new zone is.
 */
export function SplitZonesDialog({
    initialMode,
    onAnswer
}: SplitZonesDialogProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState(initialMode);
    const [stepText, setStepText] = useState("1");
    const step = readNumberField(stepText, 1, 127);

    return (
        <ToolDialog
            title={t("toolsLocale.split.title")}
            canApply={step !== undefined}
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (step !== undefined) {
                    onAnswer({ mode, step: Math.round(step) });
                }
            }}
        >
            <DialogSelectField
                label={t("toolsLocale.split.mode")}
                value={mode}
                options={[
                    { value: "key", label: t("toolsLocale.split.byKey") },
                    {
                        value: "velocity",
                        label: t("toolsLocale.split.byVelocity")
                    }
                ]}
                onChange={setMode}
            />
            <DialogNumberField
                label={t("toolsLocale.split.step")}
                value={stepText}
                min={1}
                max={127}
                step={1}
                onChange={setStepText}
            />
            {mode === "velocity" ? (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.split.velocityHint")}
                </p>
            ) : null}
        </ToolDialog>
    );
}
