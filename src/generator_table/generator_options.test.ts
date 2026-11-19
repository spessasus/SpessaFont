import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { getShownGeneratorOptions } from "./generator_options.ts";

function zoneWithLoop(value: number): ZoneView {
    return {
        id: 1,
        keyRange: undefined,
        velocityRange: undefined,
        generators: [{ type: GeneratorTypes.sampleModes, value }],
        modulators: [],
        childId: undefined
    };
}

function values(zones: ZoneView[], isSFe: boolean) {
    return getShownGeneratorOptions(
        GeneratorTypes.sampleModes,
        isSFe,
        zones
    )?.map((o) => o.value);
}

describe("getShownGeneratorOptions", () => {
    it("leaves the alternating loop out in SF2 mode", () => {
        expect(values([zoneWithLoop(1)], false)).not.toContain(4);
        expect(values([zoneWithLoop(1)], true)).toContain(4);
    });

    it("keeps it in SF2 mode only while every zone a pick sets has it", () => {
        expect(values([zoneWithLoop(4), zoneWithLoop(4)], false)).toContain(4);
        expect(values([zoneWithLoop(1), zoneWithLoop(4)], false)).not.toContain(
            4
        );
    });
});
