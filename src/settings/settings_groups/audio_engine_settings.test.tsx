// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AudioEngineSettings } from "./audio_engine_settings.tsx";
import { DEFAULT_SETTINGS } from "../save_load/settings_typedef.ts";

/**
 * Types into the sample rate field and leaves it, returning what was applied.
 */
function typeSampleRate(text: string) {
    const onChange = vi.fn();
    const { getAllByRole } = render(
        <AudioEngineSettings settings={DEFAULT_SETTINGS} onChange={onChange} />
    );
    // The sample rate is the first field
    const [input] = getAllByRole("textbox");
    fireEvent.change(input, { target: { value: text } });
    fireEvent.blur(input);
    return onChange.mock.calls;
}

describe("AudioEngineSettings", () => {
    afterEach(() => {
        cleanup();
    });

    it.each(["", "abc", "44.1k", "0", "1000000"])(
        "keeps the sample rate for %j, a reload at a wrong rate would follow",
        (text) => {
            expect(typeSampleRate(text)).toEqual([]);
        }
    );

    it("applies a valid sample rate, rounded", () => {
        expect(typeSampleRate("44100.4")).toEqual([[{ sampleRate: 44_100 }]]);
    });
});
