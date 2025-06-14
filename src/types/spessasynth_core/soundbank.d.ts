declare module "spessasynth_core" {
    export const sampleTypes: {
        monoSample: 0;
        rightSample: 2;
        leftSample: 4;
        linkedSample: 8;
        romMonoSample: 32769;
        romRightSample: 32770;
        romLeftSample: 32772;
        romLinkedSample: 32776;
    };

    type SampleType = keyof typeof sampleTypes;
    export type SampleTypeValue = (typeof sampleTypes)[SampleType];

    export class BasicSample {
        sampleName: string;
        sampleRate: number;
        samplePitch: number;
        samplePitchCorrection: number;
        readonly linkedSample: BasicSample | undefined;
        readonly sampleType: sampleTypes;
        sampleLoopStartIndex: number;
        sampleLoopEndIndex: number;
        readonly isCompressed: boolean;
        readonly compressedData: Uint8Array | null;
        readonly sampleData: Float32Array | null;

        readonly linkedInstruments: BasicInstrument[];

        getAudioData(): Float32Array;

        setSampleType(type: sampleTypes | number);

        unlinkSample();

        setLinkedSample(sample: BasicSample, type: sampleTypes);

        setAudioData(data: Float32Array);

        linkTo(i: BasicInstrument);

        unlinkFrom(i: BasicInstrument);
    }

    export class BasicInstrument {
        instrumentName: string;
        instrumentZones: BasicInstrumentZone[];
        readonly useCount;
        globalZone: BasicGlobalZone;
        linkedPresets: BasicPreset[];

        deleteZone(index: number): boolean;

        linkTo(p: BasicPreset);

        createZone(): BasicInstrumentZone;

        unlinkFrom(p: BasicPreset);
    }

    export interface BasicZone {
        velRange: SoundFontRange;
        keyRange: SoundFontRange;
        generators: Generator[];
        modulators: Modulator[];
        readonly hasKeyRange: boolean;
        readonly hasVelRange: boolean;

        copyFrom(z: BasicZone);

        addGenerators(...generators: Generator);

        addModulators(...modulators: Modulator);

        setGenerator(type: generatorTypes, value: number);

        getGeneratorValue(type: generatorTypes, notFoundValue: number): number;
    }

    export interface BasicGlobalZone extends BasicZone {
        copyFrom(zone: BasicZone);
    }

    export interface BasicInstrumentZone extends BasicZone {
        sample: BasicSample;
        readonly useCount: number;

        setSample(s: BasicSample);
    }

    export interface BasicPresetZone extends BasicZone {
        instrument: BasicInstrument;

        setInstrument(i: BasicInstrument);
    }

    export class BasicPreset {
        presetName: string;
        program: number;
        bank: number;
        library: number;
        genre: number;
        morphology: number;
        parentSoundBank: BasicSoundBank;
        presetZones: BasicPresetZone[];
        globalZone: BasicGlobalZone;

        constructor(b: BasicSoundBank);

        createZone(): BasicPresetZone;
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
         * @returns {ArrayBuffer}
         */
        static getDummySoundfontFile(): ArrayBuffer;

        write(options?: SoundFont2WriteOptions): Uint8Array;

        writeDLS(): Uint8Array;

        destroySoundBank(): void;

        deleteSample(sample: BasicSample);

        deletePreset(preset: BasicPreset);

        deleteInstrument(instrument: BasicInstrument);
    }

    export const loadSoundFont: (buffer: ArrayBuffer) => BasicSoundBank;
}
