import { type GeneratorType, GeneratorTypes } from "spessasynth_core";

export type RangeGenerator =
    typeof GeneratorTypes.keyRange | typeof GeneratorTypes.velRange;

export function isRangeGenerator(
    generator: GeneratorType
): generator is RangeGenerator {
    return (
        generator === GeneratorTypes.keyRange ||
        generator === GeneratorTypes.velRange
    );
}
