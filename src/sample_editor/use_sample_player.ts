import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { SampleView } from "../core_backend/entity_views.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

/**
 * What the player reads from the sample's view.
 */
export type PlayedSample = Pick<
    SampleView,
    "sampleRate" | "loopStart" | "loopEnd" | "pitchCorrection"
>;

const SAMPLE_GAIN = 0.4;
/**
 * AudioBuffer only accepts some sample rates, others are resampled to this one for playback.
 */
const FALLBACK_RATE = 48_000;
const MIN_BUFFER_RATE = 8000;
const MAX_BUFFER_RATE = 96_000;

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

/**
 * Plays the sample's audio directly (not through the synthesizer), looped or once.
 * The state is owned by the bank editor, so the next sample shown keeps playing the same way,
 * which helps finding a sample by ear. Playback stops when the component unmounts and restarts
 * when the audio changes or `playRequest` changes.
 */
export function useSamplePlayer(
    sample: PlayedSample,
    data: Float32Array | undefined,
    state: SamplePlayerState,
    playRequest: number,
    onStateChange: (state: SamplePlayerState) => void
) {
    const { audioEngine } = useAudioEngine();
    const { context, inputNode } = audioEngine;
    // The editor mounts per sample, so a sample shown while playing starts now
    const [startTime, setStartTime] = useState(() => context.currentTime);
    const [handledRequest, setHandledRequest] = useState(playRequest);
    if (handledRequest !== playRequest) {
        setHandledRequest(playRequest);
        setStartTime(context.currentTime);
    }
    const playerRef = useRef<AudioBufferSourceNode | null>(null);
    const onEnded = useEffectEvent(() => onStateChange("stopped"));

    const { sampleRate, loopStart, loopEnd, pitchCorrection } = sample;
    const isPlaying = state !== "stopped";
    // A dependency of the playback effect, so it must keep its identity between renders.
    // Only built while playing, the audio context would keep a second copy of every sample shown
    const buffer = useMemo(
        () =>
            data && isPlaying
                ? createPlaybackBuffer(context, data, sampleRate)
                : undefined,
        [context, data, isPlaying, sampleRate]
    );
    // Each new buffer starts a new source from the beginning (new audio after an undo, a rate
    // change, the first read), so the play head starts over with it
    const [startedBuffer, setStartedBuffer] = useState(buffer);
    if (startedBuffer !== buffer) {
        setStartedBuffer(buffer);
        setStartTime(context.currentTime);
    }

    useEffect(() => {
        // Plays once the audio is read
        if (!isPlaying || !buffer) {
            return;
        }
        const player = context.createBufferSource();
        player.buffer = buffer;
        player.loop = state === "playing_loop";
        player.onended = () => onEnded();
        const gain = new GainNode(context, { gain: SAMPLE_GAIN });
        player.connect(gain).connect(inputNode);
        player.start();
        playerRef.current = player;
        return () => {
            // Stopping on purpose (or switching samples) must not stop the next playback
            player.onended = null;
            player.stop();
            player.disconnect();
            gain.disconnect();
            playerRef.current = null;
        };
    }, [buffer, context, inputNode, isPlaying, state, startTime]);

    // Loop points and tuning apply to the playing sample without restarting it. The effect
    // also runs for each new player (new audio after an undo, a restart), which starts without them
    useEffect(() => {
        const player = playerRef.current;
        if (!player) {
            return;
        }
        player.loopStart = loopStart / sampleRate;
        player.loopEnd = loopEnd / sampleRate;
        player.detune.value = pitchCorrection;
    }, [
        buffer,
        loopEnd,
        loopStart,
        pitchCorrection,
        sampleRate,
        state,
        startTime
    ]);

    return {
        state,
        startTime,
        play: (isLooped: boolean) => {
            setStartTime(context.currentTime);
            onStateChange(isLooped ? "playing_loop" : "playing");
        },
        stop: () => onStateChange("stopped")
    };
}
