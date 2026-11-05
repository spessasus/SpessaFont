import { type GeneratorType, GeneratorTypes } from "spessasynth_core";

/**
 * The fine offset generators and the coarse generator that extends each one by 32768 samples.
 */
const COARSE_OFFSETS = {
    [GeneratorTypes.startAddrsOffset]: GeneratorTypes.startAddrsCoarseOffset,
    [GeneratorTypes.endAddrOffset]: GeneratorTypes.endAddrsCoarseOffset,
    [GeneratorTypes.startloopAddrsOffset]:
        GeneratorTypes.startloopAddrsCoarseOffset,
    [GeneratorTypes.endloopAddrsOffset]: GeneratorTypes.endloopAddrsCoarseOffset
} as const;

export type OffsetGenerator = keyof typeof COARSE_OFFSETS;

export const COARSE_OFFSET_SIZE = 32_768;

export function isOffsetGenerator(
    generator: GeneratorType
): generator is OffsetGenerator {
    return Object.hasOwn(COARSE_OFFSETS, generator);
}

export function getCoarseOffsetGenerator(generator: OffsetGenerator) {
    return COARSE_OFFSETS[generator];
}
