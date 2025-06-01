declare module "spessasynth_core" {
    export interface IndexedByteArray extends Uint8Array {
        currentIndex: number;
    }

    export interface Generator {
        generatorType: generatorTypes;
        generatorValue: number;
    }

    export interface Modulator {
        sourceEnum: number;
        secondarySourceEnum: number;
        modulatorDestination: generatorTypes;
        transformAmount: number;
        transformType: 0 | 2;
    }

    export type SoundFontRange = {
        min: number;
        max: number;
    };

    export interface BasicSample {
        sampleName: string;
        sampleRate: number;
        samplePitch: number;
        samplePitchCorrection: number;
        sampleLink: number;
        sampleType: number;
        sampleLoopStartIndex: number;
        sampleLoopEndIndex: number;
        isCompressed: boolean;
        compressedData: ?Uint8Array;
        useCount: number;
        sampleData: ?Float32Array;
    }

    export interface BasicInstrument {
        instrumentName: string;
        instrumentZones: BasicInstrumentZone[];
    }

    export interface BasicZone {
        velRange: SoundFontRange;
        keyRange: SoundFontRange;
        isGlobal: boolean;
        generators: Generator[];
        modulators: Modulator[];
    }

    export interface BasicInstrumentZone extends BasicZone {
        sample: BasicSample;
        useCount: number;
    }

    export interface BasicPresetZone extends BasicZone {
        instrument: BasicInstrument;
    }

    export interface BasicPreset {
        presetName: string;
        program: number;
        bank: number;
        library: number;
        genre: number;
        morphology: number;
        parentSoundBank: BasicSoundBank;
        presetZones: BasicPresetZone[];
    }

    export interface BasicSoundBank {
        soundFontInfo: Record<string, string | IndexedByteArray>;
        presets: BasicPreset[];
        samples: BasicSample[];
        instruments: BasicInstrument[];
        defaultModulators: Modulator[];
        isXGBank: boolean;
    }

    export const loadSoundFont: (buffer: ArrayBuffer) => BasicSoundBank;

    export const SpessaSynthCoreUtils: {
        consoleColors: {
            warn: string;
            unrecognized: string;
            info: string;
            recognized: string;
            value: string;
        };
        SpessaSynthInfo: (...args: unknown[]) => void;
        SpessaSynthWarn: (...args: unknown[]) => void;
        SpessaSynthGroupCollapsed: (...args: unknown[]) => void;
        SpessaSynthGroupEnd: () => void;
        readBytesAsUintBigEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readLittleEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readBytesAsString: (
            data: IndexedByteArray,
            bytes: number,
            encoding: ?string,
            trimEnd: boolean = false
        ) => string;
        readVariableLengthQuantity: (MIDIByteArray: IndexedByteArray) => number;
        inflateSync: (data: Uint8Array) => Uint8Array;
    };
}
