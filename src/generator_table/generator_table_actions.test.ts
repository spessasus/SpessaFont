import { describe, expect, it } from "vitest";
import { GeneratorTypes, Modulator } from "spessasynth_core";
import {
    createTestManager,
    expectRoundTrip,
    snapshotBank
} from "../test_utils/bank_fixture.ts";
import { SetGeneratorAction } from "./cell/set_generator_action.ts";
import { SetRangeAction } from "./cell/set_range_action.ts";
import { CreateZoneAction } from "./create_zone_action.ts";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import { EditModulatorsAction } from "./modulator_edit/edit_modulators_action.ts";

const noop = () => undefined;

describe("SetGeneratorAction", () => {
    it("sets a generator", () => {
        const manager = createTestManager();
        const zone = manager.instruments[0].zones[0];
        const previous = zone.getGenerator(GeneratorTypes.pan, null);

        expectRoundTrip(manager, [
            new SetGeneratorAction(
                zone,
                GeneratorTypes.pan,
                previous,
                250,
                noop
            )
        ]);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBe(250);
    });

    it("unsets a generator with null", () => {
        const manager = createTestManager();
        const zone = manager.instruments[0].zones[0];
        zone.setGenerator(GeneratorTypes.pan, 250, false);

        expectRoundTrip(manager, [
            new SetGeneratorAction(zone, GeneratorTypes.pan, 250, null, noop)
        ]);
        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBeNull();
    });
});

describe("SetRangeAction", () => {
    it("sets the key range", () => {
        const manager = createTestManager();
        const zone = manager.instruments[0].zones[0];

        expectRoundTrip(manager, [
            new SetRangeAction(
                zone,
                GeneratorTypes.keyRange,
                { ...zone.keyRange },
                { min: 10, max: 20 },
                noop
            )
        ]);
        expect(zone.keyRange).toEqual({ min: 10, max: 20 });
    });

    it("sets the velocity range", () => {
        const manager = createTestManager();
        const zone = manager.instruments[0].zones[0];

        expectRoundTrip(manager, [
            new SetRangeAction(
                zone,
                GeneratorTypes.velRange,
                { ...zone.velRange },
                { min: 30, max: 40 },
                noop
            )
        ]);
        expect(zone.velRange).toEqual({ min: 30, max: 40 });
    });
});

describe("CreateZoneAction", () => {
    it("adds a sample zone to an instrument", () => {
        const manager = createTestManager();
        const [instrument, template] = manager.instruments;
        const sample = manager.samples[1];

        const { before, after } = expectRoundTrip(manager, [
            new CreateZoneAction(instrument, template.zones[0], sample, noop)
        ]);
        expect(after.instruments[0].zones).toHaveLength(
            before.instruments[0].zones.length + 1
        );
        expect(sample.linkedTo).toContain(instrument);
    });

    it("adds an instrument zone to a preset", () => {
        const manager = createTestManager();
        const [preset, template] = manager.presets;
        const instrument = manager.instruments[1];

        const { before, after } = expectRoundTrip(manager, [
            new CreateZoneAction(preset, template.zones[0], instrument, noop)
        ]);
        expect(after.presets[0].zones).toHaveLength(
            before.presets[0].zones.length + 1
        );
        expect(instrument.linkedTo).toContain(preset);
    });

    it("rejects a child that does not fit the parent", () => {
        const manager = createTestManager();
        const [instrument, otherInstrument] = manager.instruments;

        const action = new CreateZoneAction(
            instrument,
            otherInstrument.zones[0],
            otherInstrument,
            noop
        );
        expect(() => action.do()).toThrow(
            "Parent and child types do not match."
        );
    });
});

describe("DeleteZoneAction", () => {
    it("removes a zone from an instrument and restores its contents on undo", () => {
        const manager = createTestManager();
        const instrument = manager.instruments[0];
        const zonesBefore = snapshotBank(manager).instruments[0].zones;

        manager.modifyBank([new DeleteZoneAction(instrument, 0, noop)]);
        expect(instrument.zones).toHaveLength(zonesBefore.length - 1);

        manager.undo();
        const zonesAfter = snapshotBank(manager).instruments[0].zones;
        expect(zonesAfter).toHaveLength(zonesBefore.length);
        expect(zonesAfter).toEqual(expect.arrayContaining(zonesBefore));
    });

    // Known bug: undo appends the recreated zone and the re-sort only orders by
    // key and velocity range, so zones with equal ranges come back in a different order.
    it.fails("restores the zone at its original position", () => {
        const manager = createTestManager();

        expectRoundTrip(manager, [
            new DeleteZoneAction(manager.instruments[0], 0, noop)
        ]);
    });

    it("removes a zone from a preset", () => {
        const manager = createTestManager();
        const preset = manager.presets[0];

        const { after } = expectRoundTrip(manager, [
            new DeleteZoneAction(preset, 0, noop)
        ]);
        expect(after.presets[0].zones).toHaveLength(0);
    });
});

describe("EditModulatorsAction", () => {
    it("replaces the zone modulators", () => {
        const manager = createTestManager();
        const zone = manager.instruments[0].zones[0];
        const modulator = Modulator.copyFrom(manager.defaultModulators[0]);

        expectRoundTrip(manager, [
            new EditModulatorsAction(zone, [modulator], noop)
        ]);
        expect(zone.modulators).toEqual([modulator]);
    });
});
