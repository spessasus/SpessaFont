declare module "spessasynth_core" {
    import type { midiControllers } from "./midi/midi_message";

    export class IndexedByteArray extends Uint8Array {
        currentIndex: number;
    }

    export interface Generator {
        generatorType: generatorTypes;
        generatorValue: number;
    }

    export class Modulator {
        /**
         * The current computed value of this modulator
         * @type {number}
         */
        currentValue: number;
        /**
         * The generator destination of this modulator
         * @type {generatorTypes}
         */
        modulatorDestination: generatorTypes;
        /**
         * The transform amount for this modulator
         * @type {number}
         */
        transformAmount: number;
        /**
         * The transform type for this modulator
         * @type {0|2}
         */
        transformType: 0 | 2;
        sourcePolarity: 0 | 1;
        sourceDirection: 0 | 1;
        sourceUsesCC: 0 | 1;
        sourceIndex: modulatorSources | midiControllers;
        sourceCurveType: modulatorCurveTypes;
        secSrcPolarity: 0 | 1;
        secSrcDirection: 0 | 1;
        secSrcUsesCC: 0 | 1;
        secSrcIndex: modulatorSources | midiControllers;
        secSrcCurveType: modulatorCurveTypes;
        /**
         * Indicates if the given modulator is chorus or reverb effects modulator.
         * This is done to simulate BASSMIDI effects behavior:
         * - defaults to 1000 transform amount rather than 200
         * - values can be changed, but anything above 200 is 1000
         * (except for values above 1000, they are copied directly)
         * - all values below are multiplied by 5 (200 * 5 = 1000)
         * - still can be disabled if the soundfont has its own modulator curve
         * - this fixes the very low amount of reverb by default and doesn't break soundfonts
         * @type {boolean}
         */
        isEffectModulator: boolean;

        /**
         * Creates a new SF2 Modulator
         * @param sourceIndex {modulatorSources|midiControllers}
         * @param sourceCurveType {modulatorCurveTypes}
         * @param sourceUsesCC {0|1}
         * @param sourcePolarity {0|1}
         * @param sourceDirection {0|1}
         * @param secSrcIndex {modulatorSources|midiControllers}
         * @param secSrcCurveType {modulatorCurveTypes}
         * @param secSrcUsesCC {0|1}
         * @param secSrcPolarity {0|1}
         * @param secSrcDirection {0|1}
         * @param destination {generatorTypes}
         * @param amount {number}
         * @param transformType {0|2}
         */
        constructor(
            sourceIndex: modulatorSources | midiControllers,
            sourceCurveType: modulatorCurveTypes,
            sourceUsesCC: 0 | 1,
            sourcePolarity: 0 | 1,
            sourceDirection: 0 | 1,
            secSrcIndex: modulatorSources | midiControllers,
            secSrcCurveType: modulatorCurveTypes,
            secSrcUsesCC: 0 | 1,
            secSrcPolarity: 0 | 1,
            secSrcDirection: 0 | 1,
            destination: generatorTypes,
            amount: number,
            transformType: 0 | 2
        );

        static copy(m: Modulator): Modulator;

        /**
         * Sum transform and create a NEW modulator
         * @param modulator {Modulator}
         * @returns {Modulator}
         */
        sumTransform(modulator: Modulator): Modulator;
    }

    export enum modulatorSources {
        noController = 0,
        noteOnVelocity = 2,
        noteOnKeyNum = 3,
        polyPressure = 10,
        channelPressure = 13,
        pitchWheel = 14,
        pitchWheelRange = 16,
        link = 127
    }

    export enum modulatorCurveTypes {
        linear = 0,
        concave = 1,
        convex = 2,
        switch = 3
    }

    export type SoundFontRange = {
        min: number;
        max: number;
    };
}
