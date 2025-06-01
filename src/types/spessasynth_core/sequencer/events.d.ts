/**
 * @param message {number[]}
 * @this {SpessaSynthSequencer}
 */
export function sendMIDIMessage(this: SpessaSynthSequencer, message: number[]): void;
/**
 * @this {SpessaSynthSequencer}
 * @param channel {number}
 * @param type {number}
 * @param value {number}
 */
export function sendMIDICC(this: SpessaSynthSequencer, channel: number, type: number, value: number): void;
/**
 * @this {SpessaSynthSequencer}
 * @param channel {number}
 * @param program {number}
 */
export function sendMIDIProgramChange(this: SpessaSynthSequencer, channel: number, program: number): void;
/**
 * Sets the pitch of the given channel
 * @this {SpessaSynthSequencer}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param MSB {number} SECOND byte of the MIDI pitchWheel message
 * @param LSB {number} FIRST byte of the MIDI pitchWheel message
 */
export function sendMIDIPitchWheel(this: SpessaSynthSequencer, channel: number, MSB: number, LSB: number): void;
/**
 * @this {SpessaSynthSequencer}
 */
export function sendMIDIReset(this: SpessaSynthSequencer): void;
