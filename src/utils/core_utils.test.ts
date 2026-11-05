import { describe, expect, it, vi } from "vitest";
import { logError, logInfo, logWarn } from "./core_utils.ts";

/**
 * The console reads `%c`, `%d`, `%o` and `%s` in its first argument, so a message there can
 * use up the details meant to follow it.
 */
function expectMessageOutsideFormat(
    args: unknown[],
    text: string,
    ...details: unknown[]
) {
    expect(String(args[0])).not.toContain(text);
    // The message is passed on its own, followed by the details
    expect(args.slice(-1 - details.length)).toEqual([text, ...details]);
}

describe("log helpers", () => {
    it("keeps the error when the message has a format sequence", () => {
        const error = new Error("decode failed");
        const spy = vi.spyOn(console, "error").mockReturnValue(undefined);
        logError("Failed to import 100%c.wav.", error);
        expectMessageOutsideFormat(
            spy.mock.calls[0] ?? [],
            "Failed to import 100%c.wav.",
            error
        );
        spy.mockRestore();
    });

    it("keeps the details of a warning with %d in it", () => {
        const spy = vi.spyOn(console, "warn").mockReturnValue(undefined);
        logWarn("Could not load kick%d.wav.", "detail", 3);
        expectMessageOutsideFormat(
            spy.mock.calls[0] ?? [],
            "Could not load kick%d.wav.",
            "detail",
            3
        );
        spy.mockRestore();
    });

    it("prints an info message with %s as it is", () => {
        const spy = vi.spyOn(console, "info").mockReturnValue(undefined);
        logInfo("Opened 50%s.sf2");
        expectMessageOutsideFormat(spy.mock.calls[0] ?? [], "Opened 50%s.sf2");
        spy.mockRestore();
    });
});
