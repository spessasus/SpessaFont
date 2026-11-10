// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import toast, { useToasterStore } from "react-hot-toast";
import { pickFile } from "../utils/pick_file.ts";
import { usePlayMIDIFile } from "./use_play_midi_file.ts";

vi.mock("../utils/pick_file.ts", () => ({ pickFile: vi.fn() }));
vi.mock("../utils/core_utils.ts", () => ({ logError: vi.fn() }));

const playMIDI = vi.hoisted(() => vi.fn());

vi.mock("../core_backend/audio_engine_context.ts", () => ({
    useAudioEngine: () => ({ audioEngine: { playMIDI } })
}));

function renderPlay() {
    return renderHook(() => ({
        play: usePlayMIDIFile(),
        toasts: useToasterStore().toasts.filter((t) => t.visible)
    }));
}

describe("usePlayMIDIFile", () => {
    beforeEach(() => {
        playMIDI.mockReset();
        vi.mocked(pickFile).mockReset();
    });
    afterEach(() => {
        act(() => toast.remove());
    });

    it("plays the picked file", async () => {
        vi.mocked(pickFile).mockResolvedValue(
            new File([new Uint8Array([1, 2, 3])], "song.mid")
        );
        playMIDI.mockResolvedValue(undefined);
        const { result } = renderPlay();
        await act(() => result.current.play());
        expect(playMIDI).toHaveBeenCalledTimes(1);
        const [data, name] = playMIDI.mock.calls[0] as [ArrayBuffer, string];
        expect(name).toBe("song.mid");
        expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("does nothing when the picker is canceled", async () => {
        vi.mocked(pickFile).mockResolvedValue(undefined);
        const { result } = renderPlay();
        await act(() => result.current.play());
        expect(playMIDI).not.toHaveBeenCalled();
    });

    it("shows the load error when the song fails", async () => {
        vi.mocked(pickFile).mockResolvedValue(new File([], "song.mid"));
        playMIDI.mockRejectedValue(new Error("bad"));
        const { result } = renderPlay();
        await act(() => result.current.play());
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].type).toBe("error");
        expect(result.current.toasts[0].message).toBe(
            "menuBarLocale.midi.loadError"
        );
    });
});
