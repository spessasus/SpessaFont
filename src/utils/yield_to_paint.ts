/**
 * Resolves after the browser has painted the current frame.
 * Use it before long synchronous work (parsing, encoding) so a loading toast shows first.
 * The timeout runs after the frame callback, which is after the paint.
 */
export function yieldToPaint() {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
    });
}
