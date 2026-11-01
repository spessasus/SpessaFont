import { describe, expect, it, vi } from "vitest";
import {
    createTestManager,
    expectRoundTrip,
    snapshotBank
} from "../../test_utils/bank_fixture.ts";
import { EditPresetAction } from "./edit_preset_action.ts";
import { DeletePresetAction } from "./delete_preset_action.ts";

const noop = () => undefined;

describe("EditPresetAction", () => {
    it("changes a preset property", () => {
        const manager = createTestManager();
        const preset = manager.presets[0];

        expectRoundTrip(manager, [
            new EditPresetAction(preset, "name", preset.name, "Renamed", noop)
        ]);
        expect(preset.name).toBe("Renamed");
    });
});

describe("DeletePresetAction", () => {
    it("removes a preset and selects its neighbor, then restores and selects it on undo", () => {
        const manager = createTestManager();
        const [first, second] = manager.presets;
        const presetsBefore = snapshotBank(manager).presets;
        const setView = vi.fn();

        manager.modifyBank([new DeletePresetAction(second, noop, setView)]);
        expect(manager.presets).toEqual([first]);
        expect(setView).toHaveBeenLastCalledWith(first);

        manager.undo();
        expect(snapshotBank(manager).presets).toEqual(presetsBefore);
        expect(setView).toHaveBeenLastCalledWith(second);
    });

    // Known bug: deleting unlinks the preset from its instruments and undo does not
    // relink them, so the instruments look unused and "remove unused elements"
    // would delete instruments that the restored preset still plays.
    it.fails("relinks the instruments of a restored preset on undo", () => {
        const manager = createTestManager();

        expectRoundTrip(manager, [
            new DeletePresetAction(manager.presets[1], noop, noop)
        ]);
    });

    it("selects the info view when the last preset is deleted", () => {
        const manager = createTestManager();
        const setView = vi.fn();

        manager.modifyBank(
            manager.presets.map((p) => new DeletePresetAction(p, noop, setView))
        );

        expect(manager.presets).toHaveLength(0);
        expect(setView).toHaveBeenLastCalledWith("info");
    });
});
