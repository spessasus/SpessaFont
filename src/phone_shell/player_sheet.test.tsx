// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlayerSheet } from "./player_sheet.tsx";

const engine = vi.hoisted(() => ({
    toggleMIDI: vi.fn(),
    rewindMIDI: vi.fn()
}));
const calls = vi.hoisted(() => new Array<string>());
const status = vi.hoisted(() => ({
    songName: "A very long song name.mid",
    time: 42,
    duration: 190,
    isPaused: false
}));

vi.mock("../core_backend/audio_engine_context.ts", () => ({
    useAudioEngine: () => ({ audioEngine: engine })
}));
vi.mock("../hooks/use_engine_status.ts", () => ({
    useEngineStatus: (select: (s: typeof status) => unknown) => select(status)
}));
vi.mock("../menu_bar/use_play_midi_file.ts", () => ({
    usePlayMIDIFile: () => () => {
        calls.push("pick");
        return Promise.resolve();
    }
}));

describe("PlayerSheet", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        calls.length = 0;
    });

    it("rewinds and toggles the song", () => {
        render(<PlayerSheet onClose={vi.fn()} />);
        fireEvent.click(
            screen.getByRole("menuitem", { name: /menuBarLocale.midi.rewind/ })
        );
        expect(engine.rewindMIDI).toHaveBeenCalledOnce();
        fireEvent.click(
            screen.getByRole("menuitem", { name: /phoneLocale.drawer.pause/ })
        );
        expect(engine.toggleMIDI).toHaveBeenCalledOnce();
    });

    it("closes before it asks for another MIDI file", () => {
        const onClose = vi.fn(() => {
            calls.push("close");
        });
        render(<PlayerSheet onClose={onClose} />);
        fireEvent.click(
            screen.getByRole("menuitem", {
                name: /phoneLocale.drawer.openAnotherMIDI/
            })
        );
        expect(calls).toEqual(["close", "pick"]);
    });

    it("titles itself with the whole song name", () => {
        render(<PlayerSheet onClose={vi.fn()} />);
        expect(
            screen.getByRole("heading", { name: "A very long song name.mid" })
        ).toBeDefined();
    });
});
