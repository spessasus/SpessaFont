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
}
