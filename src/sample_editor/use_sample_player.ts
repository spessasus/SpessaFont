import { useEffect, useMemo, useRef, useState } from "react";
import type { BasicSample } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

const SAMPLE_GAIN = 0.4;
/**
 * AudioBuffer only accepts some sample rates, others are resampled to this one for playback.
 */
const FALLBACK_RATE = 48_000;
const MIN_BUFFER_RATE = 8000;
const MAX_BUFFER_RATE = 96_000;
/**
 * The play head starts this many seconds early, as it always has. Phase 6 (canvas) revisits it.
 */
const PLAY_HEAD_LEAD = 0.1;

function createPlaybackBuffer(
    context: BaseAudioContext,
    data: Float32Array,
    sampleRate: number
) {
    let bufferRate = sampleRate;
    let bufferData = data;
    // Test case: Calm 4 with a whopping 384 kHz
    if (sampleRate < MIN_BUFFER_RATE || sampleRate > MAX_BUFFER_RATE) {
        const ratio = FALLBACK_RATE / sampleRate;
        bufferData = new Float32Array(Math.floor(data.length * ratio));
        for (let i = 0; i < bufferData.length; i++) {
            bufferData[i] = data[Math.floor(i / ratio)];
        }
        bufferRate = FALLBACK_RATE;
    }
    const buffer = context.createBuffer(
        1,
        Math.max(bufferData.length, 2),
        bufferRate
    );
    buffer.getChannelData(0).set(bufferData);
    return buffer;
}

interface Playback {
    isLooped: boolean;
    /**
     * The audio context time playback started at, for the play head.
     */
    startTime: number;
}

/**
 * Plays the sample's audio directly (not through the synthesizer), looped or once.
 * Playback stops when the component unmounts and restarts when the audio changes.
 */
export function useSamplePlayer(sample: BasicSample) {
    const { audioEngine } = useAudioEngine();
    const { context, targetNode } = audioEngine;
    const [playback, setPlayback] = useState<Playback | null>(null);
    const playerRef = useRef<AudioBufferSourceNode | null>(null);

    const data = sample.getAudioData();
    const { sampleRate, loopStart, loopEnd, pitchCorrection } = sample;
    // A dependency of the playback effect, so it must keep its identity between renders
    const buffer = useMemo(
        () => createPlaybackBuffer(context, data, sampleRate),
        [context, data, sampleRate]
    );

    useEffect(() => {
        if (!playback) {
            return;
        }
        const player = context.createBufferSource();
        player.buffer = buffer;
        player.loop = playback.isLooped;
        player.onended = () => setPlayback(null);
        const gain = new GainNode(context, { gain: SAMPLE_GAIN });
        player.connect(gain).connect(targetNode);
        player.start();
        playerRef.current = player;
        return () => {
            // Stopping on purpose must not reset the state of the next playback
            player.onended = null;
            player.stop();
            player.disconnect();
            gain.disconnect();
            playerRef.current = null;
        };
    }, [buffer, context, playback, targetNode]);

    // Loop points and tuning apply to the playing sample without restarting it
    useEffect(() => {
        const player = playerRef.current;
        if (!player) {
            return;
        }
        player.loopStart = loopStart / sampleRate;
        player.loopEnd = loopEnd / sampleRate;
        player.detune.value = pitchCorrection;
    }, [loopEnd, loopStart, pitchCorrection, sampleRate, playback]);

    let state: SamplePlayerState = "stopped";
    if (playback) {
        state = playback.isLooped ? "playing_loop" : "playing";
    }
    return {
        state,
        startTime: playback?.startTime ?? -1,
        buffer,
        play: (isLooped: boolean) =>
            setPlayback({
                isLooped,
                startTime: context.currentTime - PLAY_HEAD_LEAD
            }),
        stop: () => setPlayback(null)
    };
}
