import * as React from "react";
import {
    type PointerEventHandler,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import type { SamplePlayerState } from "../sample_editor.tsx";
import "./wave_view.css";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { useTranslation } from "react-i18next";

const SCALE_LINES_COUNT = 8;
const MIN_WAVE_THICKNESS = 1;
const MAX_LINE_THICKNESS = 10;
const LINE_WIDTH_CONSTANT = 0.9;
const LOOP_PREVIEW_POINTS = 32;
const FONT_SIZE = 16;

interface WaveViewProps {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    setLoopStart: (s: number) => void;
    setLoopEnd: (e: number) => void;
    sampleRate: number;
    playbackStartTime: number;
    playerState: SamplePlayerState;
    zoom: number;
    disabled: boolean;
    centCorrection: number;
}

const getStyle = (v: string) => {
    return getComputedStyle(
        document.querySelectorAll(".spessafont_main")[0]
    ).getPropertyValue(v);
};

export const WaveView = React.memo(function ({
    data,
    loopStart,
    loopEnd,
    setLoopStart,
    setLoopEnd,
    sampleRate,
    playbackStartTime,
    playerState,
    zoom,
    disabled,
    centCorrection
}: WaveViewProps) {
    const { t } = useTranslation();
    const waveformRef = useRef<HTMLCanvasElement>(null);
    const pointsAndInfoRef = useRef<HTMLCanvasElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const {
        audioEngine: { context }
    } = useAudioEngine();

    const playbackRate = useMemo(
        () => Math.pow(2, centCorrection / 1200),
        [centCorrection]
    );

    // -1 = do not render pointer
    const [pointerX, setPointerX] = useState(-1);
    const [size, setSize] = useState({ width: 300, height: 100 });
    const [xOffset, setXOffset] = useState(0);
    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    setSize({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });

        if (waveformRef.current) {
            observer.observe(waveformRef.current);
        }
        if (pointsAndInfoRef.current) {
            observer.observe(pointsAndInfoRef.current);
        }
        return () => observer.disconnect();
    }, []);

    const dataLength = data.length;

    useEffect(() => {
        const canvas = waveformRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        const height = size.height;
        const width = size.width * zoom;
        const halfHeight = height / 2;
        const xEnd = xOffset + canvas.width;
        ctx.clearRect(0, 0, canvas.width, height);

        // draw scale lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = getStyle("--lighter-color-end");
        const step = height / SCALE_LINES_COUNT;
        for (let i = 1; i < SCALE_LINES_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, step * i);
            ctx.lineTo(canvas.width, step * i);
            ctx.stroke();
        }

        // draw vertical lines if zoomed in far enough
        const pixelsPerSample = width / dataLength;
        if (pixelsPerSample > 6) {
            ctx.lineWidth = 1;
            const index = Math.floor((xOffset / width) * dataLength);
            const initialX = index / width;
            for (let x = initialX; x < canvas.width; x += pixelsPerSample) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
        }

        // draw waveform
        ctx.strokeStyle = getStyle("--primary-color");
        const samplesPerPixel = dataLength / width;
        ctx.lineWidth = Math.min(
            Math.max(MIN_WAVE_THICKNESS, LINE_WIDTH_CONSTANT / samplesPerPixel),
            MAX_LINE_THICKNESS
        );

        const amplifier = halfHeight;
        ctx.beginPath();

        if (samplesPerPixel >= 7) {
            for (let x = xOffset; x < xEnd; x++) {
                const start = Math.floor(x * samplesPerPixel);
                const end = Math.min(
                    Math.floor(start + samplesPerPixel),
                    dataLength
                );

                let min = 1;
                let max = -1;

                for (let i = start; i < end; i++) {
                    const value = data[i];
                    if (value < min) {
                        min = value;
                    }
                    if (value > max) {
                        max = value;
                    }
                }

                const yMin = min * amplifier + halfHeight;
                const yMax = max * amplifier + halfHeight;

                ctx.lineTo(x - xOffset, height - yMin);
                ctx.lineTo(x - xOffset, height - yMax);
            }
        } else {
            const indexStep = dataLength / width;
            let index = (xOffset / width) * dataLength;
            for (let x = xOffset; x < xEnd; x++) {
                const floor = Math.trunc(index);
                const lower = data[floor];
                const upper = data[Math.ceil(index)];
                const frac = index - floor;
                const interpolated = lower + (upper - lower) * frac;
                const y = interpolated * amplifier + halfHeight;
                ctx.lineTo(x - xOffset, height - y);
                index += indexStep;
            }
        }
        ctx.stroke();

        // Draw 16 loop points preview
        // End loop around loop start,
        // Start loop around loop end
        const loopEndPreviewStart = Math.max(0, loopEnd - LOOP_PREVIEW_POINTS);
        const loopEndPreviewEnd = Math.min(
            dataLength,
            loopEnd + LOOP_PREVIEW_POINTS
        );
        const loopLength = loopEnd - loopStart;
        const loopStartPreviewStart = Math.max(
            0,
            loopStart - LOOP_PREVIEW_POINTS
        );
        const loopStartPreviewEnd = Math.min(
            dataLength,
            loopStart + LOOP_PREVIEW_POINTS
        );

        let firstPoint = true;
        ctx.strokeStyle = "green";

        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        for (let i = loopEndPreviewStart; i < loopEndPreviewEnd; i++) {
            const sample = data[i] * amplifier + halfHeight;
            const x = ((i - loopLength) / dataLength) * width;
            if (firstPoint) {
                ctx.moveTo(x - xOffset, height - sample);
                firstPoint = false;
                continue;
            }
            ctx.lineTo(x - xOffset, height - sample);
        }
        ctx.stroke();

        ctx.strokeStyle = "red";
        ctx.beginPath();
        firstPoint = true;
        for (let i = loopStartPreviewStart; i < loopStartPreviewEnd; i++) {
            const sample = data[i] * amplifier + halfHeight;
            const x = ((i + loopLength) / dataLength) * width;
            if (firstPoint) {
                ctx.moveTo(x - xOffset, height - sample);
                firstPoint = false;
                continue;
            }
            ctx.lineTo(x - xOffset, height - sample);
        }
        ctx.stroke();

        ctx.setLineDash([]);
    }, [data, dataLength, loopEnd, loopStart, size, xOffset, zoom]);
    const playerStateRef = useRef(playerState);
    const sampleLength = dataLength / sampleRate;

    const fontColor = getStyle("--font-color");

    const pointermove: PointerEventHandler<HTMLDivElement> = (e) => {
        const rect = (e.target as HTMLDivElement).getBoundingClientRect();
        if (!rect) return;
        setPointerX(e.clientX - rect.left);
    };

    const pointerleave = () => {
        setPointerX(-1);
    };

    // Loop points and info canvas
    useEffect(() => {
        playerStateRef.current = playerState;
        const canvas = pointsAndInfoRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        const height = size.height;
        const width = size.width * zoom;
        const loopStartTime = loopStart / sampleRate;
        const loopDuration = (loopEnd - loopStart) / sampleRate;
        const loopEndTime = loopStartTime + loopDuration;
        let canRenderLoop = true;
        const draw = () => {
            const isPlaying = playerStateRef.current !== "stopped";
            if (isPlaying && canRenderLoop) {
                requestAnimationFrame(draw);
            }
            ctx.clearRect(0, 0, canvas.width, height);
            // draw loop points
            const loopStartX = (loopStart / dataLength) * width;
            const loopEndX = (loopEnd / dataLength) * width;

            ctx.lineWidth = 3;
            // offset by -1 to make the line in the middle
            ctx.strokeStyle = "green";
            ctx.beginPath();
            ctx.moveTo(loopStartX - xOffset, 0);
            ctx.lineTo(loopStartX - xOffset, height);
            ctx.stroke();

            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(loopEndX - xOffset, 0);
            ctx.lineTo(loopEndX - xOffset, height);
            ctx.stroke();

            // draw playback cursor
            if (isPlaying) {
                const elapsed =
                    (context.currentTime - playbackStartTime) * playbackRate;
                const percent =
                    elapsed > loopEndTime &&
                    playerStateRef.current === "playing_loop"
                        ? (loopStartTime +
                              ((elapsed - loopStartTime) % loopDuration)) /
                          sampleLength
                        : elapsed / sampleLength;
                const x = percent * width;

                ctx.strokeStyle = fontColor;
                ctx.beginPath();
                const xPosReal = x - xOffset;
                ctx.moveTo(xPosReal, 0);
                ctx.lineTo(xPosReal, height);
                ctx.stroke();

                // scroll into view
                if (
                    (xPosReal > canvas.width || xPosReal < 0) &&
                    scrollerRef.current
                ) {
                    scrollerRef.current.scrollLeft = x + 1;
                }
            }

            // draw hover cursor
            if (pointerX >= 0) {
                const sample = Math.round((pointerX / width) * dataLength);
                const snapped = (sample / dataLength) * width - xOffset;
                const ms = Math.round(sampleLength * (pointerX / width) * 1000);

                ctx.strokeStyle = fontColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([15, 15]);
                ctx.beginPath();
                ctx.moveTo(snapped, 0);
                ctx.lineTo(snapped, height);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw hovered sample pos
                ctx.font = `${FONT_SIZE}px monospace`;
                ctx.textAlign = "right";
                ctx.textBaseline = "top";

                const x = width / zoom - 5;
                ctx.fillText(sample.toString(), x, 5);
                ctx.fillText(ms + "ms", x, FONT_SIZE + 7);
            }

            // Draw stats
            ctx.fillStyle = fontColor;

            ctx.font = `${FONT_SIZE}px monospace`;

            let y = 5;

            // Draw sample length
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillText(`${t("sampleLocale.length")}: ${dataLength}`, 5, y);

            y += FONT_SIZE + 2;
            // Draw loop length
            ctx.fillText(
                `${t("sampleLocale.loop")}: ${loopEnd - loopStart}`,
                5,
                y
            );
            y += FONT_SIZE + 2;

            // Draw sample length in seconds
            ctx.fillText(`${Math.floor(sampleLength * 1000) / 1000}s`, 5, y);
        };
        draw();

        return () => {
            canRenderLoop = false;
        };
    }, [
        context.currentTime,
        dataLength,
        fontColor,
        loopEnd,
        loopStart,
        playbackRate,
        playbackStartTime,
        playerState,
        pointerX,
        sampleLength,
        sampleRate,
        size,
        t,
        xOffset,
        zoom
    ]);

    const setLoopStartClick = (e: React.MouseEvent<HTMLElement>) => {
        if (!waveformRef.current || disabled) {
            return;
        }
        const width = size.width * zoom;
        const canvasRect = waveformRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left + xOffset;
        const loopStartIndex = data.length * (xPos / width);
        setLoopStart(Math.round(loopStartIndex));
    };

    const setLoopEndClick = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        if (!waveformRef.current || disabled) {
            return;
        }
        const width = size.width * zoom;
        const canvasRect = waveformRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left + xOffset;
        const loopEndIndex = data.length * (xPos / width);
        setLoopEnd(Math.round(loopEndIndex));
    };
    return (
        <div
            className={`wave_view ${zoom > 1 ? "zoomed" : ""} ${disabled ? "disabled" : ""}`}
            onClick={setLoopStartClick}
            onContextMenu={setLoopEndClick}
            onPointerMove={pointermove}
            onPointerLeave={pointerleave}
        >
            <div className={"wave_view_child"}>
                <canvas
                    width={size.width}
                    height={size.height}
                    ref={waveformRef}
                ></canvas>
                <canvas
                    ref={pointsAndInfoRef}
                    width={size.width}
                    height={size.height}
                ></canvas>
            </div>

            <div
                ref={scrollerRef}
                className={"wave_view_child"}
                onScroll={(e) => {
                    const scrollX = (e.target as HTMLDivElement).scrollLeft;
                    setXOffset(scrollX);
                }}
            >
                <div
                    className={"fake_scroll"}
                    style={{ width: `${size.width * zoom}px` }}
                ></div>
            </div>
        </div>
    );
});
