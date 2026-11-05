// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { WaitingInput } from "./waiting_input.tsx";

afterEach(cleanup);

interface NumberProps {
    value: number;
    suffix?: string;
    min?: number;
    max?: number;
    type?: string;
}

/**
 * Types the text into the field and leaves it, then returns what was applied.
 */
function typeAndBlur(props: NumberProps, typed: string) {
    const setValue = vi.fn((v: number) => v);
    const { container } = render(
        <WaitingInput<number> {...props} onCommit={setValue} />
    );
    const input = container.querySelector("input");
    if (!input) {
        throw new Error("The input did not render.");
    }
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: typed } });
    fireEvent.blur(input);
    return { applied: setValue.mock.calls.map((call) => call[0]), input };
}

describe("WaitingInput", () => {
    it("keeps the value when a number field is left empty", () => {
        const { applied, input } = typeAndBlur(
            { value: 44_100, type: "number", min: 3000, max: 384_000 },
            ""
        );
        expect(applied).toEqual([]);
        expect(input.value).toBe("44100");
        expect(
            typeAndBlur({ value: 42, type: "number", min: 0, max: 127 }, "")
                .applied
        ).toEqual([]);
    });

    it("keeps the value for text that is not a number", () => {
        expect(
            typeAndBlur({ value: 48_000, suffix: "Hz" }, "44.1kHz").applied
        ).toEqual([]);
        expect(typeAndBlur({ value: 60 }, "6O").applied).toEqual([]);
    });

    it("reads a partly deleted suffix and a decimal comma like master did", () => {
        expect(
            typeAndBlur({ value: 60, suffix: " (C4)" }, "62 (C").applied
        ).toEqual([62]);
        expect(
            typeAndBlur({ value: 48_000, suffix: "Hz" }, "44100H").applied
        ).toEqual([44_100]);
        expect(typeAndBlur({ value: 5 }, "1,5").applied).toEqual([1.5]);
    });

    it("still clamps a typed number to the range", () => {
        expect(
            typeAndBlur({ value: 64, min: 0, max: 127 }, "200").applied
        ).toEqual([127]);
    });

    it("limits the typed text, not the suffix", () => {
        const { container } = render(
            <WaitingInput
                value={61}
                onCommit={(v) => v}
                maxLength={7}
                suffix={" (C#)"}
            />
        );
        expect(container.querySelector("input")?.maxLength).toBe(12);
    });
});
