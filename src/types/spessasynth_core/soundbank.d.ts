declare module "spessasynth_core" {
    export const sampleTypes: {
        monoSample: 1;
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
        readonly sampleType: SampleTypeValue;
        sampleLoopStartIndex: number;
        sampleLoopEndIndex: number;
        readonly isCompressed: boolean;
        readonly compressedData: Uint8Array | null;
        readonly sampleData: Float32Array | null;
        readonly useCount: number;

        readonly linkedInstruments: BasicInstrument[];

        constructor(
            sampleName: string,
            sampleRate: number,
            samplePitch: number,
            samplePitchCorrection: number,
            sampleType: SampleTypeValue,
            loopStart: number,
            loopEnd: number
        );

        getAudioData(): Float32Array;

        setSampleType(type: sampleTypes | number);

        unlinkSample();

        setLinkedSample(sample: BasicSample, type: sampleTypes);

        setAudioData(data: Float32Array);

        linkTo(i: BasicInstrument);

        unlinkFrom(i: BasicInstrument);

        setCompressedData(compressed: Uint8Array);
    }

    export class CreatedSample extends BasicSample {
        constructor(name: string, sampleRate: number, sampleData: Float32Array);
    }

    export class BasicInstrument {
        instrumentName: string;
        instrumentZones: BasicInstrumentZone[];
        readonly useCount;
        globalZone: BasicGlobalZone;
        linkedPresets: BasicPreset[];

        // force is not optional, so I avoid bugs
        deleteZone(index: number, force): boolean;

        linkTo(p: BasicPreset);

        createZone(): BasicInstrumentZone;

        unlinkFrom(p: BasicPreset);
    }

    export class BasicZone {
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

        getGeneratorValue<T>(
            type: generatorTypes,
            notFoundValue: T
        ): number | T;
    }

    export class BasicGlobalZone extends BasicZone {
        copyFrom(zone: BasicZone);
    }

    export class BasicInstrumentZone extends BasicZone {
        sample: BasicSample;
        readonly useCount: number;

        setSample(s: BasicSample);
    }

    export class BasicPresetZone extends BasicZone {
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
        parentSoundBank: SoundBankManager;
        presetZones: BasicPresetZone[];
        globalZone: BasicGlobalZone;

        constructor(b: SoundBankManager);

        createZone(): BasicPresetZone;

        deletePreset();

        deleteZone(index: number);
    }

    export type SoundBankElement = BasicSample | BasicInstrument | BasicPreset;

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

    export type SampleEncodingFunction = (
        audioData: Float32Array,
        sampleRate: number
    ) => Promise<Uint8Array>;

    export type ProgressFunction = (
        sampleName: string,
        writtenCount: number,
        totalSampleCount: number
    ) => Promise<unknown>;

    export type SoundFont2WriteOptions = {
        compress?: boolean;
        compressionFunction?: SampleEncodingFunction;
        progressFunction?: ProgressFunction;
        writeDefaultModulators?: boolean;
        writeExtendedLimits?: boolean;
        decompress?: boolean;
    };

    export type DLSWriteOptions = {
        progressFunction?: ProgressFunction;
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
         */
        static async getDummySoundfontFile(): Promise<ArrayBuffer>;

        async write(options?: SoundFont2WriteOptions): Promise<Uint8Array>;

        async writeDLS(options?: DLSWriteOptions): Promise<Uint8Array>;

        destroySoundBank(): void;

        cloneSample(s: BasicSample): BasicSample;

        cloneInstrument(i: BasicInstrument): BasicInstrument;

        clonePreset(p: BasicPreset): BasicPreset;

        deleteSample(sample: BasicSample);

        deletePreset(preset: BasicPreset);

        deleteInstrument(instrument: BasicInstrument);

        addPresets(...presets: BasicPreset[]);

        addSamples(...samples: BasicSample[]);

        addInstruments(...instruments: BasicInstrument[]);

        removeUnusedElements();
    }

    export const loadSoundFont: (buffer: ArrayBuffer) => BasicSoundBank;
}
