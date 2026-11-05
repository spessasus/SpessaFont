import { describe, expect, it } from "vitest";
import { BasicInstrument, EmptySample, SampleTypes } from "spessasynth_core";
import { createRemoveUnusedActions } from "../core_backend/bank_maintenance.ts";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import { getObjectId } from "../utils/object_id.ts";
import { filterElements, keepUnused } from "./filter_elements.ts";

describe("keepUnused", () => {
    it("keeps only the instruments and samples nothing uses", () => {
        const session = createTestSession();
        const { document } = session;
        const lonelySample = new EmptySample();
        lonelySample.name = "Lonely";
        document.addSample(lonelySample);
        const unusedInstrument = new BasicInstrument();
        unusedInstrument.name = "Unused";
        document.addInstrument(unusedInstrument);
        publishSetUp(session);

        const { views } = session.store.getSnapshot();
        expect(keepUnused(views, filterElements(views, ""))).toEqual({
            presets: [],
            instruments: [getObjectId(unusedInstrument)],
            samples: [getObjectId(lonelySample)]
        });
    });

    it("lists what remove unused removes: samples of unused instruments, not used stereo halves", () => {
        const session = createTestSession();
        const { document } = session;
        const [left, right] = document.samples;
        const [instrument, other] = document.instruments;
        const [, preset] = document.presets;
        left.setLinkedSample(right, SampleTypes.leftSample);
        preset.zones[0].instrument = instrument;
        other.deleteZone(0, true);
        other.deleteZone(0, true);
        const lonelySample = new EmptySample();
        lonelySample.name = "Lonely";
        document.addSample(lonelySample);
        const unusedInstrument = new BasicInstrument();
        unusedInstrument.name = "Unused";
        unusedInstrument.createZone(lonelySample);
        document.addInstrument(unusedInstrument);
        publishSetUp(session);

        const { views } = session.store.getSnapshot();
        const listed = keepUnused(views, filterElements(views, ""));
        const removed = createRemoveUnusedActions(document);
        expect(listed.samples).toEqual([getObjectId(lonelySample)]);
        expect(listed.instruments).toHaveLength(removed.instrumentCount);
        expect(listed.samples).toHaveLength(removed.sampleCount);
    });
});
