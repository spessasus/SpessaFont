import { useEffect, useRef, useState } from "react";
import { useSettings } from "../settings/settings_context.ts";

/**
 * The size of the canvas on the page, in CSS pixels.
 */
export interface CanvasSize {
    width: number;
    height: number;
}

export type DrawCanvas = (
    ctx: CanvasRenderingContext2D,
    size: CanvasSize
) => void;

interface CanvasOptions {
    /**
     * Redraws every frame while true, for live content such as a play head.
     */
    isAnimated?: boolean;
}

/**
 * Reads a color from a CSS custom property. The themes set them below `#root`, so they are read
 * from the canvas itself.
 */
export function getCanvasColor(ctx: CanvasRenderingContext2D, name: string) {
    return getComputedStyle(ctx.canvas).getPropertyValue(name).trim();
}

/**
 * Owns a canvas and draws it with `draw` in the next animation frame.
 * The canvas matches its size on the page at the device pixel ratio, and `draw` works in CSS
 * pixels on a cleared canvas. It redraws when `draw` changes (so on every render of the caller),
 * when the canvas is resized, when the theme changes, and when the pixel ratio changes (the
 * window moved to another screen, or the page was zoomed).
 */
export function useCanvas(
    draw: DrawCanvas,
    { isAnimated = false }: CanvasOptions = {}
) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<CanvasSize | null>(null);
    const [pixelRatio, setPixelRatio] = useState(() => window.devicePixelRatio);
    // Colors come from CSS custom properties, which the theme changes
    const {
        settings: { theme }
    } = useSettings();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            for (const { contentRect } of entries) {
                const { width, height } = contentRect;
                setSize((prev) =>
                    prev?.width === width && prev.height === height
                        ? prev
                        : { width, height }
                );
            }
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    // The CSS size can stay the same when only the ratio changes, so it is watched on its own
    useEffect(() => {
        const query = matchMedia(`(resolution: ${pixelRatio}dppx)`);
        const handleChange = () => setPixelRatio(window.devicePixelRatio);
        query.addEventListener("change", handleChange);
        return () => query.removeEventListener("change", handleChange);
    }, [pixelRatio]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !size || size.width === 0 || size.height === 0) {
            return;
        }
        const render = () => {
            const ratio = pixelRatio;
            const pixelWidth = Math.round(size.width * ratio);
            const pixelHeight = Math.round(size.height * ratio);
            // Setting the size clears the canvas even when it does not change
            if (ctx.canvas.width !== pixelWidth) {
                ctx.canvas.width = pixelWidth;
            }
            if (ctx.canvas.height !== pixelHeight) {
                ctx.canvas.height = pixelHeight;
            }
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, size.width, size.height);
            ctx.save();
            draw(ctx, size);
            ctx.restore();
            if (isAnimated) {
                frame = requestAnimationFrame(render);
            }
        };
        let frame = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frame);
    }, [draw, isAnimated, size, theme, pixelRatio]);

    return canvasRef;
}
