import { describe, expect, it } from "vitest";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { createRootKeyActions } from "./root_key_actions.ts";
import { EditSampleAction } from "./edit_sample_action.ts";

describe("createRootKeyActions", () => {
    it("sets the original key from the name and counts names without a note", () => {
        const session = createTestSession();
        const [named, unnamed] = session.document.samples;
        session.history.do([
            new EditSampleAction(named, "name", named.name, "Lead A#3")
        ]);

        const { actions, skipped } = createRootKeyActions([named, unnamed]);
        expectRoundTrip(session, actions);

        expect(named.originalKey).toBe(58);
        expect(skipped).toBe(1);
    });

    it("leaves a sample whose key already matches", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Saw C4"),
            new EditSampleAction(sample, "originalKey", sample.originalKey, 60)
        ]);

        expect(createRootKeyActions([sample]).actions).toEqual([]);
    });
});
