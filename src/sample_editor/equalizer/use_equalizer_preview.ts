import { useEffect, useEffectEvent, useRef } from "react";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import {
    dbToGain,
    EQ_FREQUENCIES,
    EQ_Q,
    type EqualizerSettings,
    getBandGains,
    isFlat
} from "./equalizer.ts";

interface EqualizerNodes {
    bands: BiquadFilterNode[];
    gain: GainNode;
}

function setGains(
    nodes: EqualizerNodes,
    settings: EqualizerSettings,
    sampleRate: number
) {
    for (const [i, gain] of getBandGains(settings, sampleRate).entries()) {
        nodes.bands[i].gain.value = gain;
    }
    nodes.gain.gain.value = dbToGain(settings.gain);
}

/**
 * Plays everything through the equalizer while it is not flat: the sample player and the
 * keyboard, which plays the shown sample through the synthesizer. Filters at the output hear
 * the sample at the pitch it is played at, so the result matches best at its root key.
 */
export function useEqualizerPreview(
    settings: EqualizerSettings,
    sampleRate: number
) {
    const { audioEngine } = useAudioEngine();
    const nodesRef = useRef<EqualizerNodes | null>(null);
    const isActive = !isFlat(settings);
    const setCurrentGains = useEffectEvent((nodes: EqualizerNodes) =>
        setGains(nodes, settings, sampleRate)
    );

    useEffect(() => {
        if (!isActive) {
            return;
        }
        const { context } = audioEngine;
        const bands = EQ_FREQUENCIES.map(
            (frequency) =>
                new BiquadFilterNode(context, {
                    type: "peaking",
                    frequency,
                    Q: EQ_Q
                })
        );
        const gain = new GainNode(context);
        let node: AudioNode = bands[0];
        for (const band of bands.slice(1)) {
            node = node.connect(band);
        }
        node.connect(gain);
        const nodes = { bands, gain };
        setCurrentGains(nodes);
        nodesRef.current = nodes;
        audioEngine.setOutputInsert({ input: bands[0], output: gain });
        return () => {
            audioEngine.setOutputInsert(undefined);
            for (const audioNode of [...bands, gain]) {
                audioNode.disconnect();
            }
            nodesRef.current = null;
        };
    }, [audioEngine, isActive]);

    useEffect(() => {
        if (nodesRef.current) {
            setGains(nodesRef.current, settings, sampleRate);
        }
    }, [sampleRate, settings]);
}
