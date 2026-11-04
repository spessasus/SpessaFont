import { describe, expect, it } from "vitest";
import type { BasicInstrument, BasicPreset } from "spessasynth_core";
import type { BankSession } from "../core_backend/bank_session.ts";
import {
    createTestHost,
    createTestSession,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { getViewSplits } from "./zone_splits.ts";

/**
 * The splits of an element after the test's direct edits are published to the views.
 */
function splitsOf(
    session: BankSession,
    element: BasicPreset | BasicInstrument
) {
    publishSetUp(session);
    return getViewSplits(element, session.store.getSnapshot().views);
}

describe("getViewSplits", () => {
    it("covers every key for elements without key ranges", () => {
        // The built-in sample bank sets no key ranges anywhere
        const session = createTestSession();
        const { presets, instruments } = session.document;
        // One split per instrument zone, the sample instrument has two
        const full = { min: 0, max: 127 };
        expect(splitsOf(session, presets[0])).toEqual([full, full]);
        expect(splitsOf(session, instruments[0])).toEqual([full, full]);
    });

    it("uses a zone range when the global range is not set", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.zones[0].keyRange = { min: 60, max: 72 };
        expect(splitsOf(session, instrument)[0]).toEqual({ min: 60, max: 72 });
    });

    it("does not narrow a zone's own range to the global range, like the synth", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.keyRange = { min: 0, max: 60 };
        instrument.zones[0].keyRange = { min: 72, max: 84 };
        expect(splitsOf(session, instrument)).toEqual([
            { min: 72, max: 84 },
            { min: 0, max: 60 }
        ]);
    });

    it("intersects the preset zone keys with each instrument zone's keys", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        preset.zones[0].keyRange = { min: 50, max: 127 };
        // The preset zone has its own range, so the global one does not apply to it
        preset.globalZone.keyRange = { min: 0, max: 80 };
        expect(splitsOf(session, preset)[0]).toEqual({ min: 50, max: 90 });
    });

    it("leaves out instrument zones outside the preset zone", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        preset.zones[0].keyRange = { min: 0, max: 30 };
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        expect(splitsOf(session, preset)).toEqual([{ min: 0, max: 30 }]);
    });

    it("highlights exactly the keys the synth plays", () => {
        // One host for all the sessions, as starting a synthesizer for each is slow
        const host = createTestHost();
        const ranges = [
            undefined,
            { min: 0, max: 60 },
            { min: 30, max: 90 },
            { min: 72, max: 84 }
        ];
        for (const presetGlobal of ranges) {
            for (const presetZone of ranges) {
                for (const instrumentZone of ranges) {
                    const session = createTestSession(host);
                    const [preset] = session.document.presets;
                    const [zone] = preset.zones;
                    const instrument = zone.instrument;
                    if (presetGlobal) preset.globalZone.keyRange = presetGlobal;
                    if (presetZone) zone.keyRange = presetZone;
                    if (instrumentZone) {
                        for (const z of instrument.zones) {
                            z.keyRange = instrumentZone;
                        }
                    }
                    const splits = splitsOf(session, preset);
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
