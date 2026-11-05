import { useState } from "react";
import type { GeneratorType, GenericRange } from "spessasynth_core";
import { readNumberField } from "../../dialogs/read_number_field.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    createRandomCurve,
    type CurvePattern,
    drawCurve,
    getCurveValues,
    KEY_COUNT
} from "./key_curve.ts";
import type { CurveOperation, KeyCurveSettings } from "./key_curve_actions.ts";

const MAX_FACTOR = 100;
const DISPLAY_LIMIT = 1_000_000;

/**
 * The lowest and highest value the zones play for each row, in what the row shows.
 */
export type PlayedRanges = ReadonlyMap<GeneratorType, GenericRange>;

/**
 * The default curve range of an operation, as field texts. A replace starts from what the
 * zones play now.
 */
function getDefaultRange(
    operation: CurveOperation,
    row: GeneratorRowType,
    playedRanges: PlayedRanges
) {
    switch (operation) {
        case "replace": {
            const played = playedRanges.get(row.generator);
            const format = (v: number) => v.toFixed(row.precision ?? 0);
            return played
                ? [format(played.min), format(played.max)]
                : ["0", "0"];
        }

        case "add": {
            return ["-10", "10"];
        }

        case "multiply": {
            return ["0.5", "2"];
        }
    }
}

export function createSeed() {
    return Math.floor(Math.random() * 4_294_967_296);
}

/**
 * The fields of the key curve dialog as texts, what they read as, and the settings to apply
 * (undefined while a field the pattern uses is not valid).
 */
export function useKeyCurveForm(
    initialRow: GeneratorRowType,
    playedRanges: PlayedRanges,
    initialSeed: number
) {
    const [row, setRow] = useState(initialRow);
    const [operation, setOperation] = useState<CurveOperation>("replace");
    const [pattern, setPattern] = useState<CurvePattern>("linearUp");
    const [range, setRange] = useState(() =>
        getDefaultRange("replace", initialRow, playedRanges)
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

    const limits =
        operation === "multiply"
            ? { min: 0, max: MAX_FACTOR }
            : { min: -DISPLAY_LIMIT, max: DISPLAY_LIMIT };
    const min = readNumberField(range[0], limits.min, limits.max);
    const max = readNumberField(range[1], limits.min, limits.max);
    const steepness = readNumberField(steepnessText, 1, 10);
    const spread = readNumberField(spreadText, 1, 10);
    const fromKey = readNumberField(fromText, 0, 127);
    const toKey = readNumberField(toText, 0, 127);
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
    const isRanged = pattern !== "random" && pattern !== "drawn";
    const isExponential =
        pattern === "exponentialUp" || pattern === "exponentialDown";

    // The preview falls back to the defaults while a field is invalid, OK stays disabled then
    const values = getCurveValues({
        pattern,
        fromKey: Math.round(fromKey ?? 0),
        toKey: Math.round(toKey ?? 127),
        steepness: steepness ?? 3,
        random: createRandomCurve(seed, spread ?? 1),
        drawn
    });
    const isShapeValid =
        (!isRanged || (fromKey !== undefined && toKey !== undefined)) &&
        (!isExponential || steepness !== undefined) &&
        (pattern !== "random" || spread !== undefined) &&
        (!isVelocityFiltered || velocity !== undefined);
    const settings: KeyCurveSettings | undefined =
        isShapeValid && min !== undefined && max !== undefined
            ? { row, operation, min, max, values, velocity }
            : undefined;

    return {
        row,
        pickRow: (picked: GeneratorRowType) => {
            setRow(picked);
            setRange(getDefaultRange(operation, picked, playedRanges));
        },
        operation,
        pickOperation: (picked: CurveOperation) => {
            setOperation(picked);
            setRange(getDefaultRange(picked, row, playedRanges));
        },
        pattern,
        setPattern,
        range,
        setMinText: (text: string) => setRange([text, range[1]]),
        setMaxText: (text: string) => setRange([range[0], text]),
        limits,
        /**
         * Both ends of the curve's range are the same, so every key gets one value.
         */
        isFlat: min === max,
        isRanged,
        isExponential,
        fromText,
        setFromText,
        toText,
        setToText,
        /**
         * A click picks the nearer end of a ranged curve, a right click its end.
         */
        pickKey: (key: number, isEnd: boolean) => {
            const isNearerEnd =
                Math.abs(key - (toKey ?? 127)) < Math.abs(key - (fromKey ?? 0));
            if (isEnd || isNearerEnd) {
                setToText(String(key));
            } else {
                setFromText(String(key));
            }
        },
        steepnessText,
        setSteepnessText,
        spreadText,
        setSpreadText,
        reroll: () => setSeed(createSeed()),
        draw: (
            from: { key: number; value: number },
            to: { key: number; value: number }
        ) => setDrawn((previous) => drawCurve(previous, from, to)),
        isVelocityFiltered,
        setIsVelocityFiltered,
        velocityText,
        setVelocityMinText: (text: string) =>
            setVelocityText([text, velocityText[1]]),
        setVelocityMaxText: (text: string) =>
            setVelocityText([velocityText[0], text]),
        velocity,
        values,
        settings
    };
}

export type KeyCurveForm = ReturnType<typeof useKeyCurveForm>;
