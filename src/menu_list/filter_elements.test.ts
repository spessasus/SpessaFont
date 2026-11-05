import { describe, expect, it } from "vitest";
import { BasicInstrument, EmptySample } from "spessasynth_core";
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
});
