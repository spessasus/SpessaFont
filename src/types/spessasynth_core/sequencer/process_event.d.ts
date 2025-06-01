import type { MIDIMessage } from "../midi/midi_message";
import type { SpessaSynthSequencer } from "spessasynth_core";

/**
 * Processes a single event
 * @param event {MIDIMessage}
 * @param trackIndex {number}
 * @this {SpessaSynthSequencer}
 * @private
 */
export function _processEvent(
    this: SpessaSynthSequencer,
    event: MIDIMessage,
    trackIndex: number
): void;

export class _processEvent {
    oneTickToSeconds: number;

    /**
     * Processes a single event
     * @param event {MIDIMessage}
     * @param trackIndex {number}
     * @this {SpessaSynthSequencer}
     * @private
     */
    private constructor(event: MIDIMessage, trackIndex: number);
}

/**
 * Adds 16 channels to the synth
 * @this {SpessaSynthSequencer}
 * @private
 */
export function _addNewMidiPort(this: SpessaSynthSequencer): void;
