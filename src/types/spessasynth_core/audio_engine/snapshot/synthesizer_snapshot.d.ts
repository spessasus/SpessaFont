/**
 * Represents a snapshot of the synthesizer's state.
 */
export class SynthesizerSnapshot {
    /**
     * Creates a snapshot of the synthesizer's state.
     * @param spessaSynthProcessor {SpessaSynthProcessor}
     * @returns {SynthesizerSnapshot}
     */
    static createSynthesizerSnapshot(spessaSynthProcessor: SpessaSynthProcessor): SynthesizerSnapshot;
    /**
     * Applies the snapshot to the synthesizer.
     * @param spessaSynthProcessor {SpessaSynthProcessor}
     * @param snapshot {SynthesizerSnapshot}
     */
    static applySnapshot(spessaSynthProcessor: SpessaSynthProcessor, snapshot: SynthesizerSnapshot): void;
    /**
     * The individual channel snapshots.
     * @type {ChannelSnapshot[]}
     */
    channelSnapshots: ChannelSnapshot[];
    /**
     * Key modifiers.
     * @type {KeyModifier[][]}
     */
    keyMappings: KeyModifier[][];
    /**
     * Main synth volume (set by MIDI), from 0 to 1.
     * @type {number}
     */
    mainVolume: number;
    /**
     * Master stereo panning, from -1 to 1.
     * @type {number}
     */
    pan: number;
    /**
     * The synth's interpolation type.
     * @type {interpolationTypes}
     */
    interpolation: interpolationTypes;
    /**
     * The synth's system. Values can be "gs", "gm", "gm2" or "xg".
     * @type {SynthSystem}
     */
    system: SynthSystem;
    /**
     * The current synth transposition in semitones. Can be a float.
     * @type {number}
     */
    transposition: number;
}
import { ChannelSnapshot } from "./channel_snapshot.js";
