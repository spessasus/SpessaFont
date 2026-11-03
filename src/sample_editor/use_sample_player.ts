import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { BasicSample } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import {
    dbToGain,
    EQ_FREQUENCIES,
    EQ_Q,
    type EqualizerSettings,
    getBandGains
} from "./equalizer/equalizer.ts";

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

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
 * It always plays through the equalizer filters, so turning the preview on or off (a flat
 * `equalizer`) changes the sound without restarting.
 */
export function useSamplePlayer(
    sample: BasicSample,
    state: SamplePlayerState,
    playRequest: number,
    equalizer: EqualizerSettings,
    onStateChange: (state: SamplePlayerState) => void
) {
    const { audioEngine } = useAudioEngine();
    const { context, targetNode } = audioEngine;
    // The editor mounts per sample, so a sample shown while playing starts now
    const [startTime, setStartTime] = useState(() => context.currentTime);
    const [handledRequest, setHandledRequest] = useState(playRequest);
    if (handledRequest !== playRequest) {
        setHandledRequest(playRequest);
        setStartTime(context.currentTime);
    }
    const playerRef = useRef<AudioBufferSourceNode | null>(null);
    const filtersRef = useRef<{
        bands: BiquadFilterNode[];
        gain: GainNode;
    } | null>(null);
    const onEnded = useEffectEvent(() => onStateChange("stopped"));

    const data = sample.getAudioData();
    const { sampleRate, loopStart, loopEnd, pitchCorrection } = sample;
    // A dependency of the playback effect, so it must keep its identity between renders
    const buffer = useMemo(
        () => createPlaybackBuffer(context, data, sampleRate),
        [context, data, sampleRate]
    );

    useEffect(() => {
        if (state === "stopped") {
            return;
        }
        const player = context.createBufferSource();
        player.buffer = buffer;
        player.loop = state === "playing_loop";
        player.onended = () => onEnded();
        const bands = EQ_FREQUENCIES.map(
            (frequency) =>
                new BiquadFilterNode(context, {
                    type: "peaking",
                    frequency,
                    Q: EQ_Q
                })
        );
        const eqGain = new GainNode(context);
        const gain = new GainNode(context, { gain: SAMPLE_GAIN });
        let node: AudioNode = player;
        for (const band of bands) {
            node = node.connect(band);
        }
        node.connect(eqGain).connect(gain).connect(targetNode);
        player.start();
        playerRef.current = player;
        filtersRef.current = { bands, gain: eqGain };
        return () => {
            // Stopping on purpose (or switching samples) must not stop the next playback
            player.onended = null;
            player.stop();
            for (const audioNode of [player, ...bands, eqGain, gain]) {
                audioNode.disconnect();
            }
            playerRef.current = null;
            filtersRef.current = null;
        };
    }, [buffer, context, state, startTime, targetNode]);

    // Loop points and tuning apply to the playing sample without restarting it
    useEffect(() => {
        const player = playerRef.current;
        if (!player) {
            return;
        }
        player.loopStart = loopStart / sampleRate;
        player.loopEnd = loopEnd / sampleRate;
        player.detune.value = pitchCorrection;
    }, [loopEnd, loopStart, pitchCorrection, sampleRate, state, startTime]);

    useEffect(() => {
        const filters = filtersRef.current;
        if (!filters) {
            return;
        }
        for (const [i, gain] of getBandGains(equalizer, sampleRate).entries()) {
            filters.bands[i].gain.value = gain;
        }
        filters.gain.gain.value = dbToGain(equalizer.gain);
    }, [equalizer, sampleRate, state, startTime]);

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
