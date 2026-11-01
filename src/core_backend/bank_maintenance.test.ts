import { describe, expect, it } from "vitest";
import { BasicInstrument, EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import {
    createAutoLinkActions,
    createRemoveUnusedActions
} from "./bank_maintenance.ts";

describe("createRemoveUnusedActions", () => {
    it("removes unused instruments, then samples that only they used", () => {
        const session = createTestSession();
        const document = session.document;
        const lonelySample = new EmptySample();
        lonelySample.name = "Lonely";
        document.addSample(lonelySample);
        const unusedInstrument = new BasicInstrument();
        unusedInstrument.name = "Unused";
        unusedInstrument.createZone(lonelySample);
        document.addInstrument(unusedInstrument);

        const { actions, instrumentCount, sampleCount } =
            createRemoveUnusedActions(document);
        expect(instrumentCount).toBe(1);
        expect(sampleCount).toBe(1);

        const { after } = expectRoundTrip(session, actions);
        expect(after.instruments.map((i) => i.name)).not.toContain("Unused");
        expect(after.samples.map((s) => s.name)).not.toContain("Lonely");

        session.history.undo();
        expect(lonelySample.linkedTo).toEqual([unusedInstrument]);
    });

    it("returns no actions for a bank without unused elements", () => {
        const session = createTestSession();
        expect(createRemoveUnusedActions(session.document).actions).toEqual([]);
    });
});

describe("createAutoLinkActions", () => {
    it("links samples whose names end in L and R", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.name = "Piano L";
        right.name = "Piano R";

        const actions = createAutoLinkActions(session.document.samples);
        expect(actions).toHaveLength(1);
        session.history.do(actions);

        expect(left.linkedSample).toBe(right);
        expect(left.sampleType).toBe(SampleTypes.leftSample);
        expect(right.sampleType).toBe(SampleTypes.rightSample);
    });

    it("ignores samples without a matching pair", () => {
        const session = createTestSession();
        expect(createAutoLinkActions(session.document.samples)).toEqual([]);
    });
});
