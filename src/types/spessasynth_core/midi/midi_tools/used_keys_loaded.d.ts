/**
 * Gets the used programs and keys for this MIDI file with a given sound bank
 * @this {BasicMIDI}
 * @param soundfont {SoundFontManager|BasicSoundBank} - the sound bank
 * @returns {Object<string, Set<string>>} Object<bank:program, Set<key-velocity>>
 */
export function getUsedProgramsAndKeys(this: BasicMIDI, soundfont: SoundFontManager | BasicSoundBank): {
    [x: string]: Set<string>;
};
import { SoundFontManager } from "../../synthetizer/audio_engine/engine_components/soundfont_manager.js";
