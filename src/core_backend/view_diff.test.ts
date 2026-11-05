import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { getObjectId } from "../utils/object_id.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { diffBankViews, isElementDiffEmpty } from "./view_diff.ts";

function getViews(session: ReturnType<typeof createTestSession>) {
    return session.store.getSnapshot().views;
}

describe("diffBankViews", () => {
    it("is empty for the same views", () => {
        const views = getViews(createTestSession());
        const diff = diffBankViews(views, views);

        expect(isElementDiffEmpty(diff.presets)).toBe(true);
        expect(isElementDiffEmpty(diff.instruments)).toBe(true);
        expect(isElementDiffEmpty(diff.samples)).toBe(true);
        expect(diff.defaultModulators).toBeUndefined();
    });

    it("lists only the edited sample", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const before = getViews(session);

        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Renamed")
        ]);
        const diff = diffBankViews(before, getViews(session));

        expect(diff.samples.changed.map((s) => s.name)).toEqual(["Renamed"]);
        expect(diff.samples.order).toBeUndefined();
        expect(isElementDiffEmpty(diff.presets)).toBe(true);
        expect(isElementDiffEmpty(diff.instruments)).toBe(true);
    });

    it("lists a deleted preset as removed, with the new order", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const before = getViews(session);

        session.history.do([new DeletePresetAction(preset)]);
        const diff = diffBankViews(before, getViews(session));

        expect(diff.presets.removed).toEqual([getObjectId(preset)]);
        expect(diff.presets.order).toEqual(
            session.document.presets.map((p) => getObjectId(p))
        );
        expect(diff.presets.changed).toEqual([]);
    });
});
