import "./key_curve_dialog.css";
import { useTranslation } from "react-i18next";
import type { GenericRange } from "spessasynth_core";
import { ToolDialog } from "../../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../../dialogs/dialog_number_field.tsx";
import { DialogSelectField } from "../../dialogs/dialog_select_field.tsx";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { getRangeMean } from "./key_curve.ts";
import type { KeyCurveSettings } from "./key_curve_actions.ts";
import { type CurveMarker, KeyCurveGraph } from "./key_curve_graph.tsx";
import { KeyCurvePatternFields } from "./key_curve_pattern_fields.tsx";
import { type PlayedRanges, useKeyCurveForm } from "./use_key_curve_form.ts";

/**
 * A zone the curve may set, as the ranges it plays (never unset).
 */
export interface CurveZone {
    keyRange: GenericRange;
    velRange: GenericRange;
}

interface KeyCurveDialogProps {
    rows: readonly GeneratorRowType[];
    initialRow: GeneratorRowType;
    zones: readonly CurveZone[];
    playedRanges: PlayedRanges;
    initialSeed: number;
    onAnswer: (settings: KeyCurveSettings | undefined) => void;
}

/**
 * One marker per key range (and whether the velocity filter takes it), so a large selection
 * draws a few dots instead of one per zone.
 */
function getMarkers(
    zones: readonly CurveZone[],
    values: readonly number[],
    velocity: GenericRange | undefined
) {
    const seen = new Set<string>();
    const markers = new Array<CurveMarker>();
    for (const { keyRange, velRange } of zones) {
        const isIncluded =
            !velocity ||
            (velRange.min <= velocity.max && velRange.max >= velocity.min);
        const id = `${keyRange.min}-${keyRange.max}-${isIncluded}`;
        if (seen.has(id)) {
            continue;
        }

        seen.add(id);
        markers.push({
            id,
            key: (keyRange.min + keyRange.max) / 2,
            value: getRangeMean(values, keyRange.min, keyRange.max),
            isIncluded
        });
    }
    return markers;
}

/**
 * Asks for a generator, an operation and a curve over the keys, for the key curve tool.
 */
export function KeyCurveDialog({
    rows,
    initialRow,
    zones,
    playedRanges,
    initialSeed,
    onAnswer
}: KeyCurveDialogProps) {
    const { t } = useTranslation();
    const form = useKeyCurveForm(initialRow, playedRanges, initialSeed);
    const { pattern, isRanged, settings } = form;
    // Equal ends give every key the same value, whatever the pattern
    const values = form.isFlat ? form.values.map(() => 0.5) : form.values;
    const markers = getMarkers(zones, values, form.velocity);
    const hasZones = markers.some((m) => m.isIncluded);

    const operations = [
        { value: "replace", label: t("toolsLocale.keyCurve.replace") },
        { value: "add", label: t("toolsLocale.keyCurve.add") },
        { value: "multiply", label: t("toolsLocale.keyCurve.multiply") }
    ] as const;
    const patterns = [
        { value: "linearUp", label: t("toolsLocale.keyCurve.linearUp") },
        { value: "linearDown", label: t("toolsLocale.keyCurve.linearDown") },
        {
            value: "exponentialUp",
            label: t("toolsLocale.keyCurve.exponentialUp")
        },
        {
            value: "exponentialDown",
            label: t("toolsLocale.keyCurve.exponentialDown")
        },
        { value: "random", label: t("toolsLocale.keyCurve.random") },
        { value: "drawn", label: t("toolsLocale.keyCurve.drawn") }
    ] as const;
    const step = form.operation === "multiply" ? 0.1 : 1;

    return (
        <ToolDialog
            title={t("toolsLocale.keyCurve.title")}
            canApply={hasZones && settings !== undefined}
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (settings) {
                    onAnswer(settings);
                }
            }}
        >
            <DialogSelectField
                label={t("toolsLocale.keyCurve.generator")}
                value={String(form.row.generator)}
                options={rows.map((r) => ({
                    value: String(r.generator),
                    label: t(generatorLocaleMap[r.generator])
                }))}
                onChange={(generator) => {
                    const picked = rows.find(
                        (r) => String(r.generator) === generator
                    );
                    if (picked) {
                        form.pickRow(picked);
                    }
                }}
            />
            <DialogSelectField
                label={t("toolsLocale.keyCurve.operation")}
                value={form.operation}
                options={operations}
                onChange={form.pickOperation}
            />
            <DialogSelectField
                label={t("toolsLocale.keyCurve.pattern")}
                value={pattern}
                options={patterns}
                onChange={form.setPattern}
            />
            <DialogNumberField
                label={t("toolsLocale.keyCurve.minimum")}
                value={form.range[0]}
                min={form.limits.min}
                max={form.limits.max}
                step={step}
                onChange={form.setMinText}
            />
            <DialogNumberField
                label={t("toolsLocale.keyCurve.maximum")}
                value={form.range[1]}
                min={form.limits.min}
                max={form.limits.max}
                step={step}
                onChange={form.setMaxText}
            />
            <p className={"tool_dialog_note"}>
                {form.operation === "multiply"
                    ? t("toolsLocale.keyCurve.factor")
                    : t("toolsLocale.keyCurve.shownUnits")}
            </p>
            <KeyCurvePatternFields form={form} />
            <label className={"tool_dialog_check"}>
                <input
                    type={"checkbox"}
                    checked={form.isVelocityFiltered}
                    onChange={(e) =>
                        form.setIsVelocityFiltered(e.target.checked)
                    }
                />
                <span>{t("toolsLocale.keyCurve.velocityFilter")}</span>
            </label>
            {form.isVelocityFiltered ? (
                <>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.velocityMin")}
                        value={form.velocityText[0]}
                        min={0}
                        max={127}
                        step={1}
                        onChange={form.setVelocityMinText}
                    />
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.velocityMax")}
                        value={form.velocityText[1]}
                        min={0}
                        max={127}
                        step={1}
                        onChange={form.setVelocityMaxText}
                    />
                </>
            ) : null}
            {form.isFlat ? (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.keyCurve.flat")}
                </p>
            ) : null}
            <KeyCurveGraph
                values={values}
                markers={markers}
                minLabel={form.range[0]}
                maxLabel={form.range[1]}
                onPickKey={isRanged ? form.pickKey : undefined}
                onDraw={pattern === "drawn" ? form.draw : undefined}
            />
            <p className={"tool_dialog_note"}>
                {isRanged
                    ? t("toolsLocale.keyCurve.clickHint")
                    : pattern === "drawn"
                      ? t("toolsLocale.keyCurve.drawHint")
                      : t("toolsLocale.keyCurve.randomHint")}
            </p>
            {hasZones ? null : (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.keyCurve.noZones")}
                </p>
            )}
        </ToolDialog>
    );
}
