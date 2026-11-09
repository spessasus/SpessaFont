// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { TranslatedOptionsContext } from "../utils/translated_options/translated_options_context.ts";
import { ControlsPanel } from "./controls_panel.tsx";

const handlers = vi.hoisted(() => ({
    current: undefined as ((event: ForwardedSynthEvent) => void) | undefined
}));

vi.mock("../hooks/use_synth_event.ts", () => ({
    useSynthEvent: (handler: (event: ForwardedSynthEvent) => void) => {
        handlers.current = handler;
    }
}));
// The knobs and ranges read the keyboard channel's values, which need no engine here
vi.mock("../hooks/use_synth_value.ts", () => ({
    useSynthValue: () => 0
}));
const engineStatus = vi.hoisted(() => ({ isSongPlaying: false }));
vi.mock("../hooks/use_engine_status.ts", () => ({
    useEngineStatus: () => engineStatus.isSongPlaying
}));
vi.mock("../core_backend/audio_engine_context.ts", () => ({
    useAudioEngine: () => ({ audioEngine: {} })
}));

function noteOn(channel: number, midiNote: number, velocity: number) {
    act(() => {
        handlers.current?.({
            type: "noteOn",
            data: { channel, midiNote, velocity }
        });
    });
}

function renderPanel() {
    render(
        <TranslatedOptionsContext value={{ controllers: [], destinations: [] }}>
            <ControlsPanel />
        </TranslatedOptionsContext>
    );
}

describe("ControlsPanel", () => {
    beforeEach(() => {
        handlers.current = undefined;
        engineStatus.isSongPlaying = false;
    });
    afterEach(cleanup);

    it("shows nine controller slots, pitch wheel and pressure", () => {
        renderPanel();
        expect(screen.getAllByRole("combobox")).toHaveLength(9);
        // Eight knobs (the sustain pedal slot is a switch) and the two ranges
        expect(screen.getAllByRole("slider")).toHaveLength(10);
    });

    it("shows the last note-on of the keyboard channel", () => {
        renderPanel();
        const readout = screen.getByRole("group", {
            name: "phoneLocale.drawer.lastNote"
        });
        expect(readout.textContent).toContain("-");
        noteOn(0, 64, 90);
        expect(readout.textContent).toContain("64");
        expect(readout.textContent).toContain("90");
        noteOn(3, 50, 20);
        expect(readout.textContent).toContain("64");
        expect(readout.textContent).not.toContain("50");
    });

    it("says the song owns the channel while one plays", () => {
        expect(
            renderPanelText(false).includes("phoneLocale.drawer.songOnChannel")
        ).toBe(false);
        cleanup();
        expect(
            renderPanelText(true).includes("phoneLocale.drawer.songOnChannel")
        ).toBe(true);
    });
});

function renderPanelText(isSongPlaying: boolean) {
    engineStatus.isSongPlaying = isSongPlaying;
    renderPanel();
    return document.body.textContent ?? "";
}
