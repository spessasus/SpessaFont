export const KEY_COUNT = 128;

export type CurvePattern =
    | "linearUp"
    | "linearDown"
    | "exponentialUp"
    | "exponentialDown"
    | "random"
    | "drawn";

export interface CurveShape {
    pattern: CurvePattern;
    /**
     * Where a linear or exponential curve starts and ends, flat outside.
     */
    fromKey: number;
    toKey: number;
    /**
     * How much an exponential curve bends, 1 to 10.
     */
    steepness: number;
    /**
     * The random and drawn curves, one value from 0 to 1 per key.
     */
    random: readonly number[];
    drawn: readonly number[];
}

/**
 * A small seeded generator (mulberry32), so a random curve can be shown, applied and tested
 * with the same values.
 */
export function createRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d_2b_79_f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
}

/**
 * One value from 0 to 1 per key, each the mean of `spread` uniform draws, so a higher spread
 * gathers the values around the middle.
 */
export function createRandomCurve(seed: number, spread: number) {
    const next = createRandom(seed);
    const draws = Math.max(1, Math.round(spread));
    return Array.from({ length: KEY_COUNT }, () => {
        let sum = 0;
        for (let i = 0; i < draws; i++) {
            sum += next();
        }
        return sum / draws;
    });
}

/**
 * The position of a key between the curve's start and end, from 0 to 1.
 * When they are the same key, the curve steps there.
 */
function getPosition(key: number, from: number, to: number) {
    if (from === to) {
        return key < from ? 0 : 1;
    }
    return Math.max(0, Math.min(1, (key - from) / (to - from)));
}

function exponential(t: number, steepness: number) {
    return (Math.exp(steepness * t) - 1) / (Math.exp(steepness) - 1);
}

/**
 * The curve's value from 0 to 1 at each key.
 */
export function getCurveValues(shape: CurveShape) {
    const { pattern, fromKey, toKey, steepness } = shape;
    return Array.from({ length: KEY_COUNT }, (_, key) => {
        const t = getPosition(key, fromKey, toKey);
        switch (pattern) {
            case "linearUp": {
                return t;
            }

            case "linearDown": {
                return 1 - t;
            }

            case "exponentialUp": {
                return exponential(t, steepness);
            }

            case "exponentialDown": {
                return exponential(1 - t, steepness);
            }

            case "random": {
                return shape.random[key] ?? 0.5;
            }

            case "drawn": {
                return shape.drawn[key] ?? 0.5;
            }
        }
    });
}

/**
 * The mean of the curve over a key range, the value a zone of that range takes.
 */
export function getRangeMean(
    values: readonly number[],
    min: number,
    max: number
) {
    let sum = 0;
    for (let key = min; key <= max; key++) {
        sum += values[key];
    }
    return sum / (max - min + 1);
}

/**
 * The drawn curve after the pointer moved from one key and value to another, with the keys
 * between them on a straight line.
 */
export function drawCurve(
    drawn: readonly number[],
    from: { key: number; value: number },
    to: { key: number; value: number }
) {
    const next = [...drawn];
    const [start, end] = from.key <= to.key ? [from, to] : [to, from];
    for (let key = start.key; key <= end.key; key++) {
        const t =
            end.key === start.key
                ? 1
                : (key - start.key) / (end.key - start.key);
        next[key] = start.value + t * (end.value - start.value);
    }
    return next;
}
