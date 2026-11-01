import { describe, expect, it } from "vitest";
import { BasicInstrument } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../../test_utils/bank_fixture.ts";
import { EditInstrumentNameAction } from "./edit_instrument_name_action.ts";
import { DeleteInstrumentAction } from "./delete_instrument_action.ts";

describe("EditInstrumentNameAction", () => {
    it("renames an instrument", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];

        expectRoundTrip(session, [
            new EditInstrumentNameAction(instrument, instrument.name, "Renamed")
        ]);
        expect(instrument.name).toBe("Renamed");
    });
});

describe("DeleteInstrumentAction", () => {
    it("removes an unused instrument and focuses its neighbor, then restores and focuses it on undo", () => {
        const session = createTestSession();
        const unused = new BasicInstrument();
        unused.name = "Unused";
        session.document.addInstrument(unused);
        const neighbor = session.document.instruments.at(-2);

        const { after, doFocus, undoFocus } = expectRoundTrip(session, [
            new DeleteInstrumentAction(unused)
        ]);
        expect(after.instruments.map((i) => i.name)).not.toContain("Unused");
        expect(doFocus).toBe(neighbor);
        expect(undoFocus).toBe(unused);
    });

    it("refuses to delete an instrument that a preset uses and leaves the bank unchanged", () => {
        const session = createTestSession();
        const used = session.document.instruments[0];

        expect(() =>
            session.history.do([new DeleteInstrumentAction(used)])
        ).toThrow("Cannot delete an instrument that is used by");
        expect(session.document.instruments).toContain(used);
        expect(session.history.canUndo).toBe(false);
    });

    it("relinks the samples of a restored instrument on undo", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const instrument = preset.zones[0].instrument;
        preset.deleteZone(0);
        const sample = instrument.zones[0].sample;
        // The sample bank uses the sample in more than one zone, with one link per zone
        const linksBefore = [...sample.linkedTo];

        session.history.do([new DeleteInstrumentAction(instrument)]);
        expect(sample.linkedTo).not.toContain(instrument);

        session.history.undo();
        expect(sample.linkedTo).toEqual(linksBefore);
    });
});
