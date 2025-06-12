import * as React from "react";
import { useEffect, useRef, useState } from "react";

const SCALE_LINES_COUNT = 8;

export function WaveView({
    data,
    loopStart,
    loopEnd,
    setLoopStart,
    setLoopEnd,
    sampleRate
}: {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    setLoopStart: (s: number) => void;
    setLoopEnd: (e: number) => void;
    sampleRate: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ width: 300, height: 100 });
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

        if (canvasRef.current) {
            observer.observe(canvasRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        const { width, height } = size;
        const halfHeight = height / 2;
        ctx.clearRect(0, 0, width, height);

        const getStyle = (v: string) => {
            return getComputedStyle(
                document.getElementsByClassName("spessafont_main")[0]
            ).getPropertyValue(v);
        };

        // draw scale lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = getStyle("--top-buttons-color-start");
        const step = height / SCALE_LINES_COUNT;
        for (let i = 1; i < SCALE_LINES_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, step * i);
            ctx.lineTo(width, step * i);
            ctx.stroke();
        }

        // draw waveform
        ctx.strokeStyle = getStyle("--primary-color");
        const samplesPerPixel = Math.floor(data.length / width) || 1;
        ctx.lineWidth = Math.max(1, 5 / samplesPerPixel);
        const amplifier = halfHeight - ctx.lineWidth * 2;
        ctx.beginPath();
        if (samplesPerPixel >= 7) {
            for (let x = 0; x < width; x++) {
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

                ctx.lineTo(x, height - yMin);
                ctx.lineTo(x, height - yMax);
            }
        } else {
            const step = width / (data.length - 1);
            let x = 0;
            for (let i = 0; i < data.length; i++) {
                const y = data[i] * amplifier + halfHeight;
                ctx.lineTo(x, height - y);
                x += step;
            }
        }
        ctx.stroke();

        // draw loop points
        const loopStartX = (loopStart / data.length) * width;
        const loopEndX = (loopEnd / data.length) * width;

        ctx.lineWidth = 2;

        ctx.strokeStyle = "green";
        ctx.beginPath();
        ctx.moveTo(loopStartX, 0);
        ctx.lineTo(loopStartX, height);
        ctx.stroke();

        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(loopEndX, 0);
        ctx.lineTo(loopEndX, height);
        ctx.stroke();

        // draw sample rate
        ctx.fillStyle = getStyle("--font-color");
        ctx.textBaseline = "hanging";
        ctx.textAlign = "start";
        ctx.font = "1rem monospace";
        ctx.fillText(`${sampleRate} Hz`, 10, 10);
        ctx.textAlign = "end";
        ctx.fillText(
            `${Math.floor((data.length / sampleRate) * 1000) / 1000}s`,
            width - 10,
            10
        );
    }, [data, loopEnd, loopStart, sampleRate, size]);

    const setLoopStartClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) {
            return;
        }
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left;
        const loopStartIndex = data.length * (xPos / canvasRect.width);
        setLoopStart(loopStartIndex);
    };

    const setLoopEndClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!canvasRef.current) {
            return;
        }
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const xPos = e.clientX - canvasRect.left;
        const loopEndIndex = data.length * (xPos / canvasRect.width);
        setLoopEnd(loopEndIndex);
    };

    return (
        <canvas
            onClick={setLoopStartClick}
            onContextMenu={setLoopEndClick}
            ref={canvasRef}
            width={size.width}
            height={size.height}
            className={"wave_view"}
        ></canvas>
    );
}
