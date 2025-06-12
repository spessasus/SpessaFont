import * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { SamplePlayerState } from "../sample_editor.tsx";
import "./wave_view.css";

const SCALE_LINES_COUNT = 8;

export function WaveView({
    data,
    loopStart,
    loopEnd,
    setLoopStart,
    setLoopEnd,
    sampleRate,
    playbackStartTime,
    playerState,
    context,
    zoom
}: {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    setLoopStart: (s: number) => void;
    setLoopEnd: (e: number) => void;
    sampleRate: number;
    playbackStartTime: number;
    playerState: SamplePlayerState;
    context: AudioContext;
    zoom: number;
}) {
    const waveformRef = useRef<HTMLCanvasElement>(null);
    const pointsAndInfoRef = useRef<HTMLCanvasElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);

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

    const getStyle = (v: string) => {
        return getComputedStyle(
            document.getElementsByClassName("spessafont_main")[0]
        ).getPropertyValue(v);
    };

    useEffect(() => {
        const canvas = waveformRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        const height = size.height;
        const width = size.width * zoom;
        const halfHeight = height / 2;
        ctx.clearRect(0, 0, canvas.width, height);

        // draw scale lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = getStyle("--top-buttons-color-start");
        const step = height / SCALE_LINES_COUNT;
        for (let i = 1; i < SCALE_LINES_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, step * i);
            ctx.lineTo(canvas.width, step * i);
            ctx.stroke();
        }

        // draw waveform
        ctx.strokeStyle = getStyle("--primary-color");
        const samplesPerPixel = Math.floor(data.length / width) || 1;
        ctx.lineWidth = Math.max(1, 5 / samplesPerPixel);
        const amplifier = halfHeight - ctx.lineWidth * 2;
        ctx.beginPath();
        const xEnd = xOffset + canvas.width;
        if (samplesPerPixel >= 7) {
            for (let x = xOffset; x < xEnd; x++) {
                const start = x * samplesPerPixel;
                const end = Math.min(start + samplesPerPixel, data.length);

                let min = 1.0;
                let max = -1.0;

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
            const indexStep = data.length / width;
            let index = (xOffset / width) * data.length;
            for (let x = xOffset; x < xEnd; x++) {
                const lower = data[~~index];
                const upper = data[Math.ceil(index)];
                const frac = index - ~~index;
                const interpolated = lower + (upper - lower) * frac;
                const y = interpolated * amplifier + halfHeight;
                ctx.lineTo(x - xOffset, height - y);
                index += indexStep;
            }
        }
        ctx.stroke();
    }, [data, size, xOffset, zoom]);
    const playerStateRef = useRef(playerState);
    const sampleLength = data.length / sampleRate;

    const fontColor = getStyle("--font-color");

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
            const loopStartX = (loopStart / data.length) * width;
            const loopEndX = (loopEnd / data.length) * width;

            ctx.lineWidth = 2;

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
                const elapsed = context.currentTime - playbackStartTime;
                let percent: number;
                if (
                    elapsed > loopEndTime &&
                    playerStateRef.current === "playing_loop"
                ) {
                    // loop
                    percent =
                        (loopStartTime +
                            ((elapsed - loopStartTime) % loopDuration)) /
                        sampleLength;
                } else {
                    percent = elapsed / sampleLength;
                }
                const x = percent * width;

                ctx.strokeStyle = fontColor;
                ctx.beginPath();
                const xPosReal = x - xOffset;
                ctx.moveTo(xPosReal, 0);
                ctx.lineTo(xPosReal, height);
                ctx.stroke();

                // scroll into view
                if (xPosReal > canvas.width || xPosReal < 0) {
                    if (scrollerRef.current) {
                        scrollerRef.current.scrollLeft = x + 1;
                    }
                }
            }

            // draw sample rate
            ctx.fillStyle = fontColor;
            ctx.textBaseline = "hanging";
            ctx.textAlign = "start";
            ctx.font = "1rem monospace";
            ctx.fillText(`${sampleRate} Hz`, 10, 10);
            ctx.textAlign = "end";
            ctx.fillText(
                `${Math.floor(sampleLength * 1000) / 1000}s`,
                canvas.width - 10, // use canvas so zoom doesn't impact
                10
            );
        };
        draw();

        return () => {
            canRenderLoop = false;
        };
    }, [
        context.currentTime,
        data.length,
        fontColor,
        loopEnd,
        loopStart,
        playbackStartTime,
        playerState,
        sampleLength,
        sampleRate,
        size,
        xOffset,
        zoom
    ]);

    const setLoopStartClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!waveformRef.current) {
            return;
        }
        const canvasRect = waveformRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left;
        const loopStartIndex = data.length * (xPos / canvasRect.width);
        setLoopStart(loopStartIndex);
    };

    const setLoopEndClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!waveformRef.current) {
            return;
        }
        const canvasRect = waveformRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left;
        const loopEndIndex = data.length * (xPos / canvasRect.width);
        setLoopEnd(loopEndIndex);
    };
    return (
        <div className={`wave_view ${zoom > 1 ? "zoomed" : ""}`}>
            <div className={"wave_view_child"}>
                <canvas
                    width={size.width}
                    height={size.height}
                    ref={waveformRef}
                ></canvas>
                <canvas
                    onClick={setLoopStartClick}
                    onContextMenu={setLoopEndClick}
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
                    style={{ width: `${zoom * 100}%` }}
                ></div>
            </div>
        </div>
    );
}
