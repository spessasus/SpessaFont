import { useTranslation } from "react-i18next";
import { DialogNumberField } from "../../dialogs/dialog_number_field.tsx";
import type { KeyCurveForm } from "./use_key_curve_form.ts";

interface KeyCurvePatternFieldsProps {
    form: KeyCurveForm;
}

/**
 * The fields of the picked pattern: where a ranged curve starts and ends, how much an
 * exponential one bends, or how a random one spreads.
 */
export function KeyCurvePatternFields({ form }: KeyCurvePatternFieldsProps) {
    const { t } = useTranslation();
    return (
        <>
            {form.isRanged ? (
                <>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.fromKey")}
                        value={form.fromText}
                        min={0}
                        max={127}
                        step={1}
                        onChange={form.setFromText}
                    />
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.toKey")}
                        value={form.toText}
                        min={0}
                        max={127}
                        step={1}
                        onChange={form.setToText}
                    />
                </>
            ) : null}
            {form.isExponential ? (
                <DialogNumberField
                    label={t("toolsLocale.keyCurve.steepness")}
                    value={form.steepnessText}
                    min={1}
                    max={10}
                    step={1}
                    onChange={form.setSteepnessText}
                />
            ) : null}
            {form.pattern === "random" ? (
                <div className={"tool_dialog_field"}>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.spread")}
                        value={form.spreadText}
                        min={1}
                        max={10}
                        step={1}
                        onChange={form.setSpreadText}
                    />
                    <button
                        type={"button"}
                        className={"pretty_button hover_brightness"}
                        onClick={form.reroll}
                    >
                        {t("toolsLocale.keyCurve.reroll")}
                    </button>
                </div>
            ) : null}
        </>
    );
}
