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
    const splits = getViewSplits(element, session.store.getSnapshot().views);
    if (!splits) {
        throw new Error("An element always has splits.");
    }
    return splits;
}

/**
 * The key ranges only, for the tests that do not set velocity ranges.
 */
function keySplitsOf(
    session: BankSession,
    element: BasicPreset | BasicInstrument
) {
    return splitsOf(session, element).map((split) => split.keys);
}

describe("getViewSplits", () => {
    it("covers every key for elements without key ranges", () => {
        // The built-in sample bank sets no key ranges anywhere
        const session = createTestSession();
        const { presets, instruments } = session.document;
        // One split per instrument zone, the sample instrument has two
        const full = { min: 0, max: 127 };
        const split = { keys: full, velocities: full };
        expect(splitsOf(session, presets[0])).toEqual([split, split]);
        expect(splitsOf(session, instruments[0])).toEqual([split, split]);
    });

    it("uses a zone range when the global range is not set", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.zones[0].keyRange = { min: 60, max: 72 };
        expect(keySplitsOf(session, instrument)[0]).toEqual({
            min: 60,
            max: 72
        });
    });

    it("does not narrow a zone's own range to the global range, like the synth", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.keyRange = { min: 0, max: 60 };
        instrument.zones[0].keyRange = { min: 72, max: 84 };
        expect(keySplitsOf(session, instrument)).toEqual([
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
        expect(keySplitsOf(session, preset)[0]).toEqual({ min: 50, max: 90 });
    });

    it("leaves out instrument zones outside the preset zone", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        preset.zones[0].keyRange = { min: 0, max: 30 };
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        expect(keySplitsOf(session, preset)).toEqual([{ min: 0, max: 30 }]);
    });

    it("intersects velocity ranges and takes the global one for zones without", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const [instrumentZone] = preset.zones[0].instrument.zones;
        preset.globalZone.velRange = { min: 0, max: 100 };
        instrumentZone.velRange = { min: 50, max: 127 };
        expect(splitsOf(session, preset)[0].velocities).toEqual({
            min: 50,
            max: 100
        });
    });

    it("has no splits for an instrument without zones, so no key plays", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        while (instrument.zones.length > 0) {
            instrument.deleteZone(0, true);
        }
        expect(splitsOf(session, instrument)).toEqual([]);
    });

    it("has no ranges for the overview", () => {
        const session = createTestSession();
        expect(
            getViewSplits("info", session.store.getSnapshot().views)
        ).toBeUndefined();
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
                    const splits = keySplitsOf(session, preset);
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
