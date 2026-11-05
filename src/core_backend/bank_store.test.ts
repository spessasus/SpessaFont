import { describe, expect, it } from "vitest";
import { EmptySample, GeneratorTypes } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import { getObjectId } from "../utils/object_id.ts";

describe("BankStore", () => {
    it("keeps the snapshot until something changes", () => {
        const session = createTestSession();
        expect(session.store.getSnapshot()).toBe(session.store.getSnapshot());
    });

    it("keeps unchanged parts of the snapshot when an element changes", () => {
        const session = createTestSession();
        const before = session.store.getSnapshot();
        const instrument = session.document.instruments[0];

        session.history.do([
            new SetGeneratorAction(
                instrument,
                instrument.zones[0],
                GeneratorTypes.pan,
                null,
                100
            )
        ]);

        const after = session.store.getSnapshot();
        expect(after).not.toBe(before);
        expect(after.revision).toBe(before.revision + 1);
        expect(after.presets).toBe(before.presets);
        expect(after.instruments).toBe(before.instruments);
        expect(after.samples).toBe(before.samples);
        expect(after.info).toBe(before.info);
    });

    it("keeps a list when a rename keeps its order, and publishes new info when the info changes", () => {
        const session = createTestSession();
        const before = session.store.getSnapshot();
        const sample = session.document.samples[0];

        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Renamed"),
            new SetBankInfoAction("name", before.info.name, "New name")
        ]);

        const after = session.store.getSnapshot();
        expect(after.samples).toBe(before.samples);
        expect(after.lookup).toBe(before.lookup);
        expect(after.views.sampleOrder).toBe(before.views.sampleOrder);
        expect(after.views.samples.get(getObjectId(sample))?.name).toBe(
            "Renamed"
        );
        expect(after.info.name).toBe("New name");
        expect(after.presets).toBe(before.presets);
    });

    it("publishes a new list and lookup when an element is added", () => {
        const session = createTestSession();
        const before = session.store.getSnapshot();
        const sample = new EmptySample();
        sample.name = "New";

        session.history.do([new CreateSampleAction(sample)]);

        const after = session.store.getSnapshot();
        expect(after.samples).not.toBe(before.samples);
        expect(after.samples).toContain(sample);
        expect(after.lookup.sample(getObjectId(sample))).toBe(sample);
        expect(before.lookup.sample(getObjectId(sample))).toBeUndefined();
        // The lists that did not change keep their lookups
        expect(after.lookup.preset).toBe(before.lookup.preset);
        expect(after.lookup.instrument).toBe(before.lookup.instrument);
    });
});
