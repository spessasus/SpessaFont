import { describe, expect, it } from "vitest";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { EditPresetAction } from "./edit_preset_action.ts";
import { DeletePresetAction } from "./delete_preset_action.ts";

describe("EditPresetAction", () => {
    it("renames a preset", () => {
        const session = createTestSession();
        const preset = session.document.presets[0];

        expectRoundTrip(session, [
            new EditPresetAction(preset, "name", preset.name, "Renamed")
        ]);
        expect(preset.name).toBe("Renamed");
    });

    it("re-sorts the presets when the program changes", () => {
        const session = createTestSession();
        const [first, second] = session.document.presets;
        second.program = 1;
        session.document.sortPresets();
        publishSetUp(session);

        expectRoundTrip(session, [
            new EditPresetAction(first, "program", first.program, 2)
        ]);
        expect(session.document.presets).toEqual([second, first]);
    });

    it("puts presets that share a patch back in their order on undo", () => {
        // Both presets of the test bank use 000:000:000
        const session = createTestSession();
        const before = [...session.document.presets];
        const [, second] = before;

        session.history.do([
            new EditPresetAction(second, "program", second.program, 5)
        ]);
        session.history.undo();

        expect(session.document.presets).toEqual(before);
    });
});

describe("DeletePresetAction", () => {
    it("removes a preset and focuses its neighbor, then restores and focuses it on undo", () => {
        const session = createTestSession();
        const [first, second] = session.document.presets;

        const { doFocus, undoFocus } = expectRoundTrip(session, [
            new DeletePresetAction(second)
        ]);
        expect(doFocus).toBe(first);
        expect(undoFocus).toBe(second);
    });

    it("relinks the instruments of a restored preset on undo", () => {
        const session = createTestSession();
        const preset = session.document.presets[1];
        const instrument = preset.zones[0].instrument;

        session.history.do([new DeletePresetAction(preset)]);
        expect(instrument.linkedTo).not.toContain(preset);

        session.history.undo();
        expect(instrument.linkedTo).toEqual([preset]);
        session.history.redo();
        session.history.undo();
        expect(instrument.linkedTo).toEqual([preset]);
    });

    it("focuses the overview when the last preset is deleted", () => {
        const session = createTestSession();

        const focus = session.history.do(
            session.document.presets.map((p) => new DeletePresetAction(p))
        );

        expect(session.document.presets).toHaveLength(0);
        expect(focus).toBe("info");
    });
});
