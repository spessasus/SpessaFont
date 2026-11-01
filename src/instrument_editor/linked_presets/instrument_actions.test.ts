import { describe, expect, it, vi } from "vitest";
import { BasicInstrument } from "spessasynth_core";
import {
    createTestManager,
    expectRoundTrip
} from "../../test_utils/bank_fixture.ts";
import { EditInstrumentAction } from "./edit_instrument_action.ts";
import { DeleteInstrumentAction } from "./delete_instrument_action.ts";

const noop = () => undefined;

describe("EditInstrumentAction", () => {
    it("changes an instrument property", () => {
        const manager = createTestManager();
        const instrument = manager.instruments[0];

        expectRoundTrip(manager, [
            new EditInstrumentAction(
                instrument,
                "name",
                instrument.name,
                "Renamed",
                noop
            )
        ]);
        expect(instrument.name).toBe("Renamed");
    });
});

describe("DeleteInstrumentAction", () => {
    it("removes an unused instrument and selects its neighbor, then restores and selects it on undo", () => {
        const manager = createTestManager();
        const unused = new BasicInstrument();
        unused.name = "Unused";
        manager.addInstruments(unused);
        const neighbor = manager.instruments.at(-2);
        const setView = vi.fn();

        const { after } = expectRoundTrip(manager, [
            new DeleteInstrumentAction(unused, noop, setView)
        ]);
        expect(after.instruments.map((i) => i.name)).not.toContain("Unused");

        manager.undo();
        expect(setView).toHaveBeenLastCalledWith(unused);
        manager.redo();
        expect(setView).toHaveBeenLastCalledWith(neighbor);
    });

    it("refuses to delete an instrument that a preset uses", () => {
        const manager = createTestManager();
        const used = manager.instruments[0];

        expect(() =>
            manager.modifyBank([new DeleteInstrumentAction(used, noop, noop)])
        ).toThrow("Cannot delete an instrument that is used by");
    });

    // Known bug: undo puts the instrument back but does not relink its samples,
    // so they look unused and "remove unused elements" would delete them.
    it.fails("relinks the samples of a restored instrument on undo", () => {
        const manager = createTestManager();
        const [preset] = manager.presets;
        const instrument = preset.zones[0].instrument;
        preset.deleteZone(0);
        const sample = instrument.zones[0].sample;

        manager.modifyBank([
            new DeleteInstrumentAction(instrument, noop, noop)
        ]);
        manager.undo();

        expect(sample.linkedTo).toContain(instrument);
    });
});
