import {
    EQ_FREQUENCIES,
    EQ_MAX_BAND_GAIN,
    type EqualizerSettings,
    getEqualizerResponse
} from "./equalizer.ts";

const WIDTH = 100;
const HEIGHT = 100;
const POINTS = 120;

/**
 * The bands are an octave apart and the sliders are evenly spaced, so a log axis lines the
 * curve up with the sliders. It spans half an octave past the outer bands.
 */
const OCTAVES = EQ_FREQUENCIES.length;
const LOWEST = EQ_FREQUENCIES[0] / Math.SQRT2;

const FREQUENCIES = Array.from(
    { length: POINTS + 1 },
    (_, i) => LOWEST * Math.pow(2, (i / POINTS) * OCTAVES)
);

interface EqualizerCurveProps {
    settings: EqualizerSettings;
    sampleRate: number;
}

/**
 * The frequency response of the bands (without the overall gain), drawn behind the sliders
 * at the same scale, so a single band peaks at its slider.
 */
export function EqualizerCurve({ settings, sampleRate }: EqualizerCurveProps) {
    // A sample has nothing above half its rate, the response there would only repeat
    const shown = FREQUENCIES.filter((f) => f < sampleRate / 2);
    const response = getEqualizerResponse(
        { ...settings, gain: 0 },
        sampleRate,
        shown
    );
    const toY = (db: number) =>
        HEIGHT / 2 - (db / EQ_MAX_BAND_GAIN) * (HEIGHT / 2);
    const lastX = ((shown.length - 1) / POINTS) * WIDTH;
    const line = response
        .map((db, i) => `${(i / POINTS) * WIDTH},${toY(db).toFixed(2)}`)
        .join(" L");
    return (
        <svg
            className={"equalizer_curve"}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio={"none"}
            aria-hidden={true}
        >
            <line
                className={"equalizer_curve_axis"}
                x1={0}
                x2={WIDTH}
                y1={HEIGHT / 2}
                y2={HEIGHT / 2}
            />
            <path
                className={"equalizer_curve_fill"}
                d={`M0,${HEIGHT / 2} L${line} L${lastX},${HEIGHT / 2} Z`}
            />
            <path className={"equalizer_curve_line"} d={`M${line}`} />
        </svg>
    );
}
