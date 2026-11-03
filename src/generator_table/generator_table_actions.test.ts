import { describe, expect, it } from "vitest";
import {
    BasicZone,
    EmptySample,
    GeneratorTypes,
    Modulator,
    SampleTypes
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    snapshotBank
} from "../test_utils/bank_fixture.ts";
import { SetGeneratorAction } from "./cell/set_generator_action.ts";
import { SetRangeAction } from "./cell/set_range_action.ts";
import { CreateZoneAction } from "./create_zone_action.ts";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import { EditModulatorsAction } from "./modulator_edit/edit_modulators_action.ts";
import {
    createReplaceSampleActions,
    ReplaceZoneChildAction
} from "./replace_zone_child_action.ts";

describe("SetGeneratorAction", () => {
    it("sets a generator", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];
        const previous = zone.getGenerator(GeneratorTypes.pan, null);

        expectRoundTrip(session, [
            new SetGeneratorAction(
                instrument,
                zone,
                GeneratorTypes.pan,
                previous,
                250
            )
        ]);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBe(250);
    });

    it("unsets a generator with null", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];
        zone.setGenerator(GeneratorTypes.pan, 250, false);

        expectRoundTrip(session, [
            new SetGeneratorAction(
                instrument,
                zone,
                GeneratorTypes.pan,
                250,
                null
            )
        ]);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBeNull();
    });
});

describe("SetRangeAction", () => {
    it("sets the key range", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];

        expectRoundTrip(session, [
            new SetRangeAction(
                instrument,
                zone,
                GeneratorTypes.keyRange,
                zone.keyRange,
                { min: 10, max: 20 }
            )
        ]);
        expect(zone.keyRange).toEqual({ min: 10, max: 20 });
    });

    it("sets the velocity range", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];

        expectRoundTrip(session, [
            new SetRangeAction(
                instrument,
                zone,
                GeneratorTypes.velRange,
                zone.velRange,
                { min: 30, max: 40 }
            )
        ]);
        expect(zone.velRange).toEqual({ min: 30, max: 40 });
    });
});

describe("CreateZoneAction", () => {
    it("adds a sample zone to an instrument and focuses the instrument", () => {
        const session = createTestSession();
        const [instrument, template] = session.document.instruments;
        const sample = session.document.samples[1];

        const { before, after, doFocus } = expectRoundTrip(session, [
            new CreateZoneAction(instrument, template.zones[0], sample)
        ]);
        expect(after.instruments[0].zones).toHaveLength(
            before.instruments[0].zones.length + 1
        );
        expect(sample.linkedTo).toContain(instrument);
        expect(doFocus).toBe(instrument);
    });

    it("adds an instrument zone to a preset", () => {
        const session = createTestSession();
        const [preset, template] = session.document.presets;
        const instrument = session.document.instruments[1];

        const { before, after } = expectRoundTrip(session, [
            new CreateZoneAction(preset, template.zones[0], instrument)
        ]);
        expect(after.presets[0].zones).toHaveLength(
            before.presets[0].zones.length + 1
        );
        expect(instrument.linkedTo).toContain(preset);
    });

    it("restores the same zone object on redo, so later edits to it can still be undone", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const sample = session.document.samples[1];
        session.history.do([
            new CreateZoneAction(instrument, new BasicZone(), sample)
        ]);
        const zone = instrument.zones.find((z) => z.sample === sample);
        if (!zone) throw new Error("The zone was not created.");
        session.history.do([
            new SetGeneratorAction(
                instrument,
                zone,
                GeneratorTypes.pan,
                null,
                100
            )
        ]);

        session.history.undo();
        session.history.undo();
        session.history.redo();
        session.history.redo();

        expect(instrument.zones).toContain(zone);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBe(100);
    });

    it("rejects a child that does not fit the parent", () => {
        const session = createTestSession();
        const [instrument, otherInstrument] = session.document.instruments;

        expect(() =>
            session.history.do([
                new CreateZoneAction(
                    instrument,
                    otherInstrument.zones[0],
                    otherInstrument
                )
            ])
        ).toThrow("Parent and child types do not match.");
    });
});

describe("DeleteZoneAction", () => {
    it("removes a zone from an instrument and restores it at its original position", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];

        expectRoundTrip(session, [new DeleteZoneAction(instrument, zone)]);
        session.history.undo();
        expect(instrument.zones[0]).toBe(zone);
        expect(zone.sample.linkedTo).toContain(instrument);
    });

    it("removes both zones of a stereo pair and restores them", () => {
        const session = createTestSession();
        const [instrument, other] = session.document.instruments;
        session.history.do([
            new CreateZoneAction(
                instrument,
                other.zones[0],
                other.zones[0].sample
            )
        ]);
        const zonesBefore = snapshotBank(session.document.bank).instruments[0]
            .zones;
        const [first, second] = instrument.zones;

        expectRoundTrip(session, [
            new DeleteZoneAction(instrument, first),
            new DeleteZoneAction(instrument, second)
        ]);
        session.history.undo();
        expect(
            snapshotBank(session.document.bank).instruments[0].zones
        ).toEqual(zonesBefore);
    });

    it("removes a zone from a preset", () => {
        const session = createTestSession();
        const preset = session.document.presets[0];

        const { after } = expectRoundTrip(session, [
            new DeleteZoneAction(preset, preset.zones[0])
        ]);
        expect(after.presets[0].zones).toHaveLength(0);
    });
});

describe("EditModulatorsAction", () => {
    it("replaces the zone modulators", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const zone = instrument.zones[0];
        const modulator = Modulator.copyFrom(
            session.document.bank.defaultModulators[0]
        );

        expectRoundTrip(session, [
            new EditModulatorsAction(instrument, zone, [modulator])
        ]);
        expect(zone.modulators).toEqual([modulator]);
    });
});

describe("ReplaceZoneChildAction", () => {
    it("swaps the sample of a zone and keeps its generators", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, other] = session.document.samples;
        const zone = instrument.zones[0];
        const old = zone.sample;
        zone.setGenerator(GeneratorTypes.pan, 100, false);
        // One link per zone that uses the sample
        const links = (sample: typeof old) =>
            sample.linkedTo.filter((i) => i === instrument).length;
        const oldLinks = links(old);
        const otherLinks = links(other);

        const { after } = expectRoundTrip(session, [
            new ReplaceZoneChildAction(instrument, zone, other)
        ]);
        expect(after.instruments[0].zones[0].sample).toBe(other.name);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBe(100);
        expect(links(old)).toBe(oldLinks - 1);
        expect(links(other)).toBe(otherLinks + 1);
    });

    it("swaps the instrument of a preset zone", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const [, other] = session.document.instruments;

        const { after } = expectRoundTrip(session, [
            new ReplaceZoneChildAction(preset, preset.zones[0], other)
        ]);
        expect(after.presets[0].zones[0].instrument).toBe(other.name);
    });

    it("gives a stereo column both halves of a stereo sample, side by side", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = session.document.samples;
        const newLeft = new EmptySample();
        const newRight = new EmptySample();
        newLeft.setLinkedSample(newRight, SampleTypes.leftSample);
        left.setLinkedSample(right, SampleTypes.leftSample);
        const leftZone = instrument.createZone(left);
        const rightZone = instrument.createZone(right);

        const actions = createReplaceSampleActions(
            instrument,
            rightZone,
            leftZone,
            newLeft
        );
        session.history.do(actions);
        expect(leftZone.sample).toBe(newLeft);
        expect(rightZone.sample).toBe(newRight);
        session.history.undo();
        expect(leftZone.sample).toBe(left);
        expect(rightZone.sample).toBe(right);
    });
});
