// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MIDIProvider } from "./midi_provider.tsx";
import { useMIDIAccess } from "./midi_context.ts";
import { SettingsProvider } from "../settings_provider.tsx";
import {
    DEFAULT_SETTINGS,
    SPESSAFONT_SETTINGS_KEY
} from "../save_load/settings_typedef.ts";
import { loadSettings } from "../save_load/load.ts";

/**
 * A browser's MIDI access with two keyboards, which a test can plug in and out.
 */
function stubMIDIAccess() {
    const access = Object.assign(new EventTarget(), {
        inputs: new Map([
            ["a", { id: "a", name: "Keyboard A", state: "connected" }],
            ["b", { id: "b", name: "Keyboard B", state: "connected" }]
        ])
    });
    vi.stubGlobal("navigator", {
        requestMIDIAccess: () => Promise.resolve(access)
    });
    return {
        setState: (id: string, state: string) => {
            const input = access.inputs.get(id);
            if (!input) {
                throw new Error(`No input ${id}`);
            }
            input.state = state;
            access.dispatchEvent(new Event("statechange"));
        }
    };
}

function renderWithSavedInput(midiInputId: string) {
    return renderHook(() => useMIDIAccess(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <SettingsProvider
                initialSettings={{ ...DEFAULT_SETTINGS, midiInputId }}
            >
                <MIDIProvider>{children}</MIDIProvider>
            </SettingsProvider>
        )
    });
}

describe("MIDIProvider", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
    });

    it("selects the saved input once access is granted", async () => {
        stubMIDIAccess();
        const { result } = renderWithSavedInput("b");

        await waitFor(() => {
            expect(result.current.selectedDevice?.id).toBe("b");
        });
    });

    it("saves the selected input", async () => {
        stubMIDIAccess();
        const { result } = renderWithSavedInput("");
        await waitFor(() => {
            expect(result.current.devices).toHaveLength(2);
        });

        act(() => {
            result.current.setSelectedDevice(result.current.devices[0]);
        });

        expect(result.current.selectedDevice?.id).toBe("a");
        expect(loadSettings().midiInputId).toBe("a");
    });

    it("drops an unplugged input, which releases its notes, and selects it again when it is back", async () => {
        const midi = stubMIDIAccess();
        const { result } = renderWithSavedInput("a");
        await waitFor(() => {
            expect(result.current.selectedDevice?.id).toBe("a");
        });

        // An open port stays in the inputs as disconnected
        act(() => {
            midi.setState("a", "disconnected");
        });
        expect(result.current.selectedDevice).toBeNull();
        expect(result.current.devices.map((device) => device.id)).toEqual([
            "b"
        ]);

        act(() => {
            midi.setState("a", "connected");
        });
        expect(result.current.selectedDevice?.id).toBe("a");
    });
});
