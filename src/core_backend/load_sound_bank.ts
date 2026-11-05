import { BasicMIDI, BasicSoundBank, SoundBankLoader } from "spessasynth_core";
import { SOFTWARE_NAME } from "../utils/software_name.ts";

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * A parsed bank and the file it came from, which the mirror loads too.
 */
export interface LoadedBank {
    bank: BasicSoundBank;
    file: ArrayBuffer;
    /**
     * Whether the file has 24-bit sample data, of which core reads 16 bits.
     */
    has24BitSamples: boolean;
}

/**
 * The editor's bank has the structure only. The mirror loads the file again with the samples.
 */
const EDITOR_LOAD_OPTIONS = { sampleData: false };

function readFourCC(view: DataView, offset: number) {
    return String.fromCodePoint(
        ...Array.from({ length: 4 }, (_, i) => view.getUint8(offset + i))
    );
}

/**
 * Whether an SF2 file has an `sm24` chunk (the low 8 bits of 24-bit samples), which core skips
 * when reading, so every save drops it.
 */
function hasSm24Chunk(file: ArrayBuffer) {
    const view = new DataView(file);
    if (
        file.byteLength < 12 ||
        readFourCC(view, 0) !== "RIFF" ||
        readFourCC(view, 8) !== "sfbk"
    ) {
        return false;
    }
    let offset = 12;
    while (offset + 12 <= file.byteLength) {
        const size = view.getUint32(offset + 4, true);
        const isSampleList =
            readFourCC(view, offset) === "LIST" &&
            readFourCC(view, offset + 8) === "sdta";
        if (isSampleList) {
            const end = Math.min(offset + 8 + size, file.byteLength);
            let inner = offset + 12;
            while (inner + 8 <= end) {
                const innerSize = view.getUint32(inner + 4, true);
                if (readFourCC(view, inner) === "sm24") {
                    return innerSize > 0;
                }
                inner += 8 + innerSize + (innerSize % 2);
            }
            return false;
        }
        offset += 8 + size + (size % 2);
    }
    return false;
}

function loadFile(file: ArrayBuffer) {
    return {
        bank: SoundBankLoader.fromArrayBuffer(file, EDITOR_LOAD_OPTIONS),
        file,
        has24BitSamples: hasSm24Chunk(file)
    };
}

export function loadSoundBank(buf: ArrayBuffer): LoadedBank {
    try {
        return loadFile(buf);
    } catch (error) {
        // Maybe MIDI can parse it? If not, the bank's error says more
        let midi: BasicMIDI;
        try {
            midi = BasicMIDI.fromArrayBuffer(buf);
        } catch {
            // Neither, so the sound bank's error says more
            throw error;
        }
        const file = midi.embeddedSoundBank;
        if (!file) {
            throw new Error("No embedded sound bank in this file.", {
                cause: error
            });
        }
        return loadFile(file);
    }
}

/**
 * Compressed samples whose length core cannot read from their Ogg pages, so the editor's bank
 * says 0: FLAC data and broken streams, which core decodes to silence or in part.
 */
export function getUndecodableSamples(bank: BasicSoundBank) {
    return bank.samples.filter((s) => s.isCompressed && s.sampleLength === 0);
}

/**
 * A new, unnamed bank based on the built-in sample bank.
 */
export function loadNewBank(): LoadedBank {
    const file = SAMPLE_BANK_FILE.slice();
    const bank = SoundBankLoader.fromArrayBuffer(file, EDITOR_LOAD_OPTIONS);
    bank.soundBankInfo.software = SOFTWARE_NAME;
    bank.soundBankInfo.name = "";
    return { bank, file, has24BitSamples: false };
}
