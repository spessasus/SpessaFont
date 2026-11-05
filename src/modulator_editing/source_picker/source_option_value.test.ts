import { describe, expect, it } from "vitest";
import {
    type MIDIController,
    ModulatorControllerSources
} from "spessasynth_core";
import {
    fromSourceOptionValue,
    NON_CC_SOURCES,
    type SpessaFontModulatorSource,
    toSourceOptionValue
} from "./source_option_value.ts";

describe("source option values", () => {
    it("keeps no controller apart from CC 0", () => {
        const noController = toSourceOptionValue({
            usesCC: false,
            sourceIndex: ModulatorControllerSources.noController
        });
        expect(noController).not.toBe(
            toSourceOptionValue({ usesCC: true, sourceIndex: 0 })
        );
        expect(fromSourceOptionValue(noController)).toEqual({
            usesCC: false,
            sourceIndex: ModulatorControllerSources.noController
        });
    });

    it("round-trips every source and every CC", () => {
        const sources: SpessaFontModulatorSource[] = [
            ...NON_CC_SOURCES.map((sourceIndex) => ({
                usesCC: false,
                sourceIndex
            })),
            { usesCC: false, sourceIndex: ModulatorControllerSources.link },
            ...Array.from({ length: 128 }, (_, cc) => ({
                usesCC: true,
                // Every CC number, the picker lists only the legal ones
                sourceIndex: cc as MIDIController
            }))
        ];
        for (const source of sources) {
            expect(fromSourceOptionValue(toSourceOptionValue(source))).toEqual(
                source
            );
        }
    });
});
