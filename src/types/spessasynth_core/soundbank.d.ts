declare module "spessasynth_core" {
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
        compressedData: Uint8Array | null;
        useCount: number;
        sampleData: Float32Array | null;
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

    export type SoundFontInfoType =
        | "INAM"
        | "ICRD"
        | "IENG"
        | "IPRD"
        | "ICOP"
        | "ICMT"
        | "ifil"
        | "isng"
        | "irom"
        | "iver"
        | "ISFT";

    export type SoundFont2WriteOptions = {
        /**
         * - if the soundfont should be compressed with the Ogg Vorbis codec
         */
        compress: boolean;
        /**
         * - the vorbis compression quality, from -0.1 to 1
         */
        compressionQuality: number;
        /**
         * - the encode vorbis function.
         * Can be undefined if not compressed.
         */
        compressionFunction: EncodeVorbisFunction | undefined;
    };

    export class BasicSoundBank {
        soundFontInfo: Record<
            SoundFontInfoType,
            string | IndexedByteArray | undefined
        >;
        presets: BasicPreset[];
        samples: BasicSample[];
        instruments: BasicInstrument[];
        defaultModulators: Modulator[];
        customDefaultModulators: boolean;
        isXGBank: boolean;

        /**
         * Creates a simple soundfont with one saw wave preset.
         * @returns {ArrayBufferLike}
         */
        static getDummySoundfontFile(): ArrayBufferLike;

        write(options?: SoundFont2WriteOptions): Uint8Array;

        writeDLS(): Uint8Array;

        destroySoundBank(): void;
    }

    export const loadSoundFont: (buffer: ArrayBuffer) => BasicSoundBank;
}
