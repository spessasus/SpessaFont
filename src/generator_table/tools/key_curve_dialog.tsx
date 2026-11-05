import "./key_curve_dialog.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GenericRange } from "spessasynth_core";
import { ToolDialog } from "../../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../../dialogs/dialog_number_field.tsx";
import { DialogSelectField } from "../../dialogs/dialog_select_field.tsx";
import { readNumberField } from "../../dialogs/read_number_field.ts";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    createRandomCurve,
    type CurvePattern,
    drawCurve,
    getCurveValues,
    getRangeMean,
    KEY_COUNT
} from "./key_curve.ts";
import type { CurveOperation, KeyCurveSettings } from "./key_curve_actions.ts";
import { KeyCurveGraph } from "./key_curve_graph.tsx";

/**
 * A zone the curve may set, as plain ranges (played ranges, never unset).
 */
export interface CurveZone {
    id: number;
    keyRange: GenericRange;
    velRange: GenericRange;
}

interface KeyCurveDialogProps {
    rows: readonly GeneratorRowType[];
    initialRow: GeneratorRowType;
    zones: readonly CurveZone[];
    /**
     * What an unset generator shows, for the default range of a replace.
     */
    getShownDefault: (row: GeneratorRowType) => number;
    initialSeed: number;
    onAnswer: (settings: KeyCurveSettings | undefined) => void;
}

const MAX_FACTOR = 100;
const DISPLAY_LIMIT = 1_000_000;

/**
 * The default curve range of an operation, as field texts.
 */
function getDefaultRange(
    operation: CurveOperation,
    row: GeneratorRowType,
    getShownDefault: (row: GeneratorRowType) => number
) {
    switch (operation) {
        case "replace": {
            const shown = getShownDefault(row).toFixed(row.precision ?? 0);
            return [shown, shown];
        }

        case "add": {
            return ["-10", "10"];
        }

        case "multiply": {
            return ["0.5", "2"];
        }
    }
}

/**
 * Asks for a generator, an operation and a curve over the keys, for the key curve tool.
 */
export function KeyCurveDialog({
    rows,
    initialRow,
    zones,
    getShownDefault,
    initialSeed,
    onAnswer
}: KeyCurveDialogProps) {
    const { t } = useTranslation();
    const [row, setRow] = useState(initialRow);
    const [operation, setOperation] = useState<CurveOperation>("replace");
    const [pattern, setPattern] = useState<CurvePattern>("linearUp");
    const [range, setRange] = useState(() =>
        getDefaultRange("replace", initialRow, getShownDefault)
    );
    const [steepnessText, setSteepnessText] = useState("3");
    const [spreadText, setSpreadText] = useState("1");
    const [fromText, setFromText] = useState("0");
    const [toText, setToText] = useState("127");
    const [isVelocityFiltered, setIsVelocityFiltered] = useState(false);
    const [velocityText, setVelocityText] = useState(["0", "127"]);
    const [seed, setSeed] = useState(initialSeed);
    const [drawn, setDrawn] = useState(() =>
        new Array<number>(KEY_COUNT).fill(0.5)
    );

    const limit = operation === "multiply" ? MAX_FACTOR : DISPLAY_LIMIT;
    const lowLimit = operation === "multiply" ? 0 : -DISPLAY_LIMIT;
    const min = readNumberField(range[0], lowLimit, limit);
    const max = readNumberField(range[1], lowLimit, limit);
    const steepness = readNumberField(steepnessText, 1, 10) ?? 3;
    const spread = readNumberField(spreadText, 1, 10) ?? 1;
    const fromKey = Math.round(readNumberField(fromText, 0, 127) ?? 0);
    const toKey = Math.round(readNumberField(toText, 0, 127) ?? 127);
    const velocityMin = readNumberField(velocityText[0], 0, 127);
    const velocityMax = readNumberField(velocityText[1], 0, 127);
    const velocity: GenericRange | undefined =
        isVelocityFiltered &&
        velocityMin !== undefined &&
        velocityMax !== undefined
            ? {
                  min: Math.min(velocityMin, velocityMax),
                  max: Math.max(velocityMin, velocityMax)
              }
            : undefined;

    const values = getCurveValues({
        pattern,
        fromKey,
        toKey,
        steepness,
        random: createRandomCurve(seed, spread),
        drawn
    });
    const markers = zones.map((zone) => ({
        id: zone.id,
        key: (zone.keyRange.min + zone.keyRange.max) / 2,
        value: getRangeMean(values, zone.keyRange.min, zone.keyRange.max),
        isIncluded:
            !velocity ||
            (zone.velRange.min <= velocity.max &&
                zone.velRange.max >= velocity.min)
    }));
    const hasZones = markers.some((m) => m.isIncluded);
    const isVelocityValid = !isVelocityFiltered || velocity !== undefined;
    const canApply =
        hasZones && isVelocityValid && min !== undefined && max !== undefined;
    const isRanged = pattern !== "random" && pattern !== "drawn";
    const unitNote =
        operation === "multiply"
            ? t("toolsLocale.keyCurve.factor")
            : t("toolsLocale.keyCurve.shownUnits");

    const pickRow = (generator: string) => {
        const picked = rows.find((r) => String(r.generator) === generator);
        if (!picked) {
            return;
        }

        setRow(picked);
        setRange(getDefaultRange(operation, picked, getShownDefault));
    };

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

    return (
        <ToolDialog
            title={t("toolsLocale.keyCurve.title")}
            canApply={canApply}
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (min !== undefined && max !== undefined) {
                    onAnswer({ row, operation, min, max, values, velocity });
                }
            }}
        >
            <DialogSelectField
                label={t("toolsLocale.keyCurve.generator")}
                value={String(row.generator)}
                options={rows.map((r) => ({
                    value: String(r.generator),
                    label: t(generatorLocaleMap[r.generator])
                }))}
                onChange={pickRow}
            />
            <DialogSelectField
                label={t("toolsLocale.keyCurve.operation")}
                value={operation}
                options={operations}
                onChange={(picked) => {
                    setOperation(picked);
                    setRange(getDefaultRange(picked, row, getShownDefault));
                }}
            />
            <DialogSelectField
                label={t("toolsLocale.keyCurve.pattern")}
                value={pattern}
                options={patterns}
                onChange={setPattern}
            />
            <DialogNumberField
                label={t("toolsLocale.keyCurve.minimum")}
                value={range[0]}
                min={lowLimit}
                max={limit}
                step={operation === "multiply" ? 0.1 : 1}
                onChange={(text) => setRange([text, range[1]])}
            />
            <DialogNumberField
                label={t("toolsLocale.keyCurve.maximum")}
                value={range[1]}
                min={lowLimit}
                max={limit}
                step={operation === "multiply" ? 0.1 : 1}
                onChange={(text) => setRange([range[0], text])}
            />
            <p className={"tool_dialog_note"}>{unitNote}</p>
            {isRanged ? (
                <>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.fromKey")}
                        value={fromText}
                        min={0}
                        max={127}
                        step={1}
                        onChange={setFromText}
                    />
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.toKey")}
                        value={toText}
                        min={0}
                        max={127}
                        step={1}
                        onChange={setToText}
                    />
                </>
            ) : null}
            {pattern === "exponentialUp" || pattern === "exponentialDown" ? (
                <DialogNumberField
                    label={t("toolsLocale.keyCurve.steepness")}
                    value={steepnessText}
                    min={1}
                    max={10}
                    step={1}
                    onChange={setSteepnessText}
                />
            ) : null}
            {pattern === "random" ? (
                <div className={"tool_dialog_field"}>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.spread")}
                        value={spreadText}
                        min={1}
                        max={10}
                        step={1}
                        onChange={setSpreadText}
                    />
                    <button
                        type={"button"}
                        className={"pretty_button hover_brightness"}
                        onClick={() =>
                            setSeed(Math.floor(Math.random() * 4_294_967_296))
                        }
                    >
                        {t("toolsLocale.keyCurve.reroll")}
                    </button>
                </div>
            ) : null}
            <label className={"tool_dialog_check"}>
                <input
                    type={"checkbox"}
                    checked={isVelocityFiltered}
                    onChange={(e) => setIsVelocityFiltered(e.target.checked)}
                />
                <span>{t("toolsLocale.keyCurve.velocityFilter")}</span>
            </label>
            {isVelocityFiltered ? (
                <>
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.velocityMin")}
                        value={velocityText[0]}
                        min={0}
                        max={127}
                        step={1}
                        onChange={(text) =>
                            setVelocityText([text, velocityText[1]])
                        }
                    />
                    <DialogNumberField
                        label={t("toolsLocale.keyCurve.velocityMax")}
                        value={velocityText[1]}
                        min={0}
                        max={127}
                        step={1}
                        onChange={(text) =>
                            setVelocityText([velocityText[0], text])
                        }
                    />
                </>
            ) : null}
            <KeyCurveGraph
                values={values}
                markers={markers}
                minLabel={range[0]}
                maxLabel={range[1]}
                onPickKey={
                    isRanged
                        ? (key, isEnd) => {
                              const isNearerEnd =
                                  Math.abs(key - toKey) <
                                  Math.abs(key - fromKey);
                              if (isEnd || isNearerEnd) {
                                  setToText(String(key));
                              } else {
                                  setFromText(String(key));
                              }
                          }
                        : undefined
                }
                onDraw={
                    pattern === "drawn"
                        ? (from, to) =>
                              setDrawn((previous) =>
                                  drawCurve(previous, from, to)
                              )
                        : undefined
                }
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
