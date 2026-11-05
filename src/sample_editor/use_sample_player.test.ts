// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
    type PlayedSample,
    type SamplePlayerState,
    useSamplePlayer
} from "./use_sample_player.ts";

class FakeNode {
    public connect<T>(node: T) {
        return node;
    }

    public disconnect() {
        // Nothing is connected
    }
}

/**
 * Just enough of an AudioContext for the player, recording when sources start.
 */
const fake = vi.hoisted(() => ({
    currentTime: 0,
    starts: new Array<number>(),
    buffers: 0
}));

vi.mock("../core_backend/audio_engine_context.ts", () => {
    const context = {
        get currentTime() {
            return fake.currentTime;
        },
        createBuffer: (_channels: number, length: number) => {
            fake.buffers++;
            const data = new Float32Array(length);
            return { getChannelData: () => data };
        },
        createBufferSource: () => ({
            connect: <T>(node: T) => node,
            disconnect: () => {
                // Nothing is connected
            },
            detune: { value: 0 },
            start: () => {
                fake.starts.push(fake.currentTime);
            },
            stop: () => {
                // Nothing plays
            }
        })
    };
    const audioEngine = { context, inputNode: {} };
    return { useAudioEngine: () => ({ audioEngine }) };
});

const SAMPLE: PlayedSample = {
    sampleRate: 44_100,
    loopStart: 0,
    loopEnd: 1000,
    pitchCorrection: 0
};

function renderPlayer(state: SamplePlayerState, data: Float32Array) {
    return renderHook(
        (props: { data: Float32Array; state: SamplePlayerState }) =>
            useSamplePlayer(SAMPLE, props.data, props.state, 0, () => {
                // The state stays as given
            }),
        { initialProps: { data, state } }
    );
}

describe("useSamplePlayer", () => {
    beforeEach(() => {
        vi.stubGlobal("GainNode", FakeNode);
        fake.currentTime = 0;
        fake.starts.length = 0;
        fake.buffers = 0;
    });

    it("starts the play head over when new audio restarts the player", () => {
        const { result, rerender } = renderPlayer(
            "playing_loop",
            new Float32Array(1000)
        );
        fake.currentTime = 3;
        // New audio, as after undoing a normalize while looping
        rerender({ data: new Float32Array(1000), state: "playing_loop" });

        expect(fake.starts).toEqual([0, 3]);
        expect(result.current.startTime).toBe(3);
    });

    it("builds no playback buffer while stopped", () => {
        const { rerender } = renderPlayer("stopped", new Float32Array(1000));
        expect(fake.buffers).toBe(0);

        rerender({ data: new Float32Array(1000), state: "playing" });
        expect(fake.buffers).toBe(1);
        expect(fake.starts).toEqual([0]);
    });
});
