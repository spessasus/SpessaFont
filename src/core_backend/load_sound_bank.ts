import { BasicMIDI, BasicSoundBank, SoundBankLoader } from "spessasynth_core";
import { SOFTWARE_NAME } from "../utils/software_name.ts";

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * A parsed bank and the file it came from, which the mirror loads too.
 */
export interface LoadedBank {
    bank: BasicSoundBank;
    file: ArrayBuffer;
}

/**
 * The editor's bank has the structure only. The mirror loads the file again with the samples.
 */
const EDITOR_LOAD_OPTIONS = { sampleData: false };

export function loadSoundBank(buf: ArrayBuffer): LoadedBank {
    try {
        return {
            bank: SoundBankLoader.fromArrayBuffer(buf, EDITOR_LOAD_OPTIONS),
            file: buf
        };
    } catch (error) {
        // Maybe MIDI can parse it?
        try {
            const mid = BasicMIDI.fromArrayBuffer(buf);
            if (!mid.embeddedSoundBank) {
                throw new Error("No embedded sound bank in this file!", {
                    cause: error
                });
            }
            const file = mid.embeddedSoundBank;
            return {
                bank: SoundBankLoader.fromArrayBuffer(
                    file,
                    EDITOR_LOAD_OPTIONS
                ),
                file
            };
        } catch {
            throw error;
        }
    }
}

/**
 * A new, unnamed bank based on the built-in sample bank.
 */
export function loadNewBank(): LoadedBank {
    const file = SAMPLE_BANK_FILE.slice();
    const bank = SoundBankLoader.fromArrayBuffer(file, EDITOR_LOAD_OPTIONS);
    bank.soundBankInfo.software = SOFTWARE_NAME;
    bank.soundBankInfo.name = "";
    return { bank, file };
}
