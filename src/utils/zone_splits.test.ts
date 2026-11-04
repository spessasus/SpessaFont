import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { getViewSplits } from "./zone_splits.ts";

describe("getViewSplits", () => {
    it("covers every key for elements without key ranges", () => {
        // The built-in sample bank sets no key ranges anywhere
        const { presets, instruments } = createTestSession().document;
        // One split per instrument zone, the sample instrument has two
        const full = { min: 0, max: 127 };
        expect(getViewSplits(presets[0])).toEqual([full, full]);
        expect(getViewSplits(instruments[0])).toEqual([full, full]);
    });

    it("uses a zone range when the global range is not set", () => {
        const { instruments } = createTestSession().document;
        instruments[0].zones[0].keyRange = { min: 60, max: 72 };
        expect(getViewSplits(instruments[0])[0]).toEqual({ min: 60, max: 72 });
    });

    it("does not narrow a zone's own range to the global range, like the synth", () => {
        const { instruments } = createTestSession().document;
        const [instrument] = instruments;
        instrument.globalZone.keyRange = { min: 0, max: 60 };
        instrument.zones[0].keyRange = { min: 72, max: 84 };
        expect(getViewSplits(instrument)).toEqual([
            { min: 72, max: 84 },
            { min: 0, max: 60 }
        ]);
    });

    it("intersects the preset zone keys with each instrument zone's keys", () => {
        const { presets } = createTestSession().document;
        const [preset] = presets;
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        preset.zones[0].keyRange = { min: 50, max: 127 };
        // The preset zone has its own range, so the global one does not apply to it
        preset.globalZone.keyRange = { min: 0, max: 80 };
        expect(getViewSplits(preset)[0]).toEqual({ min: 50, max: 90 });
    });

    it("leaves out instrument zones outside the preset zone", () => {
        const { presets } = createTestSession().document;
        const [preset] = presets;
        preset.zones[0].keyRange = { min: 0, max: 30 };
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        expect(getViewSplits(preset)).toEqual([{ min: 0, max: 30 }]);
    });

    it("highlights exactly the keys the synth plays", () => {
        const ranges = [
            undefined,
            { min: 0, max: 60 },
            { min: 30, max: 90 },
            { min: 72, max: 84 }
        ];
        for (const presetGlobal of ranges) {
            for (const presetZone of ranges) {
                for (const instrumentZone of ranges) {
                    const { presets } = createTestSession().document;
                    const [preset] = presets;
                    const [zone] = preset.zones;
                    const instrument = zone.instrument;
                    if (presetGlobal) preset.globalZone.keyRange = presetGlobal;
                    if (presetZone) zone.keyRange = presetZone;
                    if (instrumentZone) {
                        for (const z of instrument.zones) {
                            z.keyRange = instrumentZone;
                        }
                    }
                    const splits = getViewSplits(preset);
                    for (let key = 0; key < 128; key++) {
                        const isShown = splits.some(
                            (r) => r.min <= key && r.max >= key
                        );
                        const isPlayed =
                            preset.getVoiceParameters(key, 64).length > 0;
                        expect(isShown, `key ${key}`).toBe(isPlayed);
                    }
                }
            }
        }
    });
});
