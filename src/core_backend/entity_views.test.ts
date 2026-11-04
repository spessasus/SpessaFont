import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectViewsUpToDate
} from "../test_utils/bank_fixture.ts";
import { getObjectId } from "../utils/object_id.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { ChangeSet } from "./change_set.ts";

function getViews(session: ReturnType<typeof createTestSession>) {
    return session.store.getSnapshot().views;
}

describe("bank views", () => {
    it("are built for every element on load, in the bank's order", () => {
        const session = createTestSession();
        const { presets, instruments, samples } = session.document;
        const views = getViews(session);

        expect(views.presetOrder).toEqual(presets.map((p) => getObjectId(p)));
        expect(views.instrumentOrder).toEqual(
            instruments.map((i) => getObjectId(i))
        );
        expect(views.sampleOrder).toEqual(samples.map((s) => getObjectId(s)));
        expect(views.samples.get(getObjectId(samples[0]))?.name).toBe(
            samples[0].name
        );
    });

    it("keep every view when a touched element did not change", () => {
        const session = createTestSession();
        const before = getViews(session);
        const changes = new ChangeSet();
        changes.touch(session.document.presets[0], session.document.samples[0]);
        changes.touchList("presets");

        session.store.commit(changes, session.store.getSnapshot().history);

        expect(getViews(session)).toBe(before);
    });

    it("replace only the renamed sample's view, not the instruments that use it", () => {
        const session = createTestSession();
        const [sample, other] = session.document.samples;
        const before = getViews(session);

        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Renamed")
        ]);

        const after = getViews(session);
        expect(after.samples.get(getObjectId(sample))?.name).toBe("Renamed");
        expect(after.samples.get(getObjectId(other))).toBe(
            before.samples.get(getObjectId(other))
        );
        expect(after.instruments).toBe(before.instruments);
        expect(after.presets).toBe(before.presets);
    });

    it("update a sample's users when only the instrument was touched", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const sample = session.document.samples[1];
        const zoneCount = instrument.zones.length;

        session.history.do([
            new CreateZoneAction(instrument, instrument.zones[0], sample)
        ]);

        const view = getViews(session).samples.get(getObjectId(sample));
        expect(view?.usedBy).toContain(getObjectId(instrument));
        expect(
            getViews(session).instruments.get(getObjectId(instrument))?.zones
        ).toHaveLength(zoneCount + 1);
        expectViewsUpToDate(session);
    });

    it("keep the views of the zones a generator edit did not change", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [edited, untouched] = instrument.zones;
        const id = getObjectId(instrument);
        const before = getViews(session).instruments.get(id);

        session.history.do([
            new SetGeneratorAction(
                instrument,
                edited,
                GeneratorTypes.initialAttenuation,
                null,
                100
            )
        ]);

        const after = getViews(session).instruments.get(id);
        expect(after).not.toBe(before);
        expect(
            after?.zones[0].generators[GeneratorTypes.initialAttenuation]
        ).toBe(100);
        expect(after?.zones[1]).toBe(before?.zones[1]);
        expect(after?.zones[1].id).toBe(getObjectId(untouched));
        expect(after?.globalZone).toBe(before?.globalZone);
    });

    it("count a sample's audio changes, which a fresh build keeps", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const id = getObjectId(sample);
        const before = getViews(session).samples.get(id)?.audioRevision;
        const changes = new ChangeSet();
        changes.touchSampleAudio(sample);

        session.store.commit(changes, session.store.getSnapshot().history);

        expect(getViews(session).samples.get(id)?.audioRevision).not.toBe(
            before
        );
        expectViewsUpToDate(session);
    });

    it("are frozen, so a write throws", () => {
        const session = createTestSession();
        const view = getViews(session).presets.get(
            getObjectId(session.document.presets[0])
        );
        expect(() => {
            Object.assign(view ?? {}, { name: "changed" });
        }).toThrow(TypeError);
    });
});
