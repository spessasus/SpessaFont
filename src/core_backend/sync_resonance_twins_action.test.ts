import { describe, expect, it } from "vitest";
import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    createTestHost,
    getMirror,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { BankSession } from "./bank_session.ts";
import { loadSoundBank } from "./load_sound_bank.ts";
import { EditModulatorsAction } from "../generator_table/modulator_edit/edit_modulators_action.ts";
import {
    isResonanceCompensator,
    syncResonanceCompensators
} from "./resonance_compensation.ts";
import { SyncResonanceTwinsAction } from "./sync_resonance_twins_action.ts";
import { SetDefaultModulatorsAction } from "../info_view/default_modulators/set_default_modulators_action.ts";

function resonanceModulator() {
    return new Modulator(
        new ModulatorSource(MIDIControllers.filterResonance, 0, true, true),
        new ModulatorSource(),
        GeneratorTypes.initialFilterQ,
        200,
        0
    );
}

/**
 * An edit of the default list that keeps it, so the sync looks at every element.
 */
function sameDefaults(session: BankSession) {
    const list = session.document.bank.defaultModulators;
    return new SetDefaultModulatorsAction(list, [...list]);
}

function countTwins(modulators: readonly Modulator[]) {
    return modulators.filter((m) => isResonanceCompensator(m)).length;
}

describe("SyncResonanceTwinsAction", () => {
    it("gives an instrument zone its twin and takes one out of a preset zone", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [preset] = session.document.presets;
        instrument.globalZone.setModulators([resonanceModulator()]);
        preset.globalZone.setModulators([resonanceModulator()]);
        // A twin in a preset zone, as a paste from SFe mode may leave it
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator()],
            true
        );
        preset.globalZone.addModulators(twin);
        publishSetUp(session);

        expectRoundTrip(session, [
            sameDefaults(session),
            new SyncResonanceTwinsAction()
        ]);

        expect(countTwins(instrument.globalZone.modulators)).toBe(1);
        expect(countTwins(preset.globalZone.modulators)).toBe(0);
    });

    it("takes the twins out of a bank with a default list of its own", () => {
        const session = createTestSession();
        const { document } = session;
        const [instrument] = document.instruments;
        instrument.globalZone.setModulators([resonanceModulator()]);
        publishSetUp(session);
        session.history.do([
            sameDefaults(session),
            new SyncResonanceTwinsAction()
        ]);
        expect(countTwins(instrument.globalZone.modulators)).toBe(1);

        document.bank.defaultModulators =
            document.bank.defaultModulators.slice(1);
        publishSetUp(session);
        expectRoundTrip(session, [
            sameDefaults(session),
            new SyncResonanceTwinsAction()
        ]);
        expect(countTwins(instrument.globalZone.modulators)).toBe(0);
    });

    it("only looks at the elements the group touched", () => {
        const session = createTestSession();
        const [first, second] = session.document.instruments;
        first.globalZone.setModulators([resonanceModulator()]);
        second.globalZone.setModulators([resonanceModulator()]);
        publishSetUp(session);

        session.history.do([
            new EditModulatorsAction(first, first.globalZone, [
                ...first.globalZone.modulators
            ]),
            new SyncResonanceTwinsAction()
        ]);

        expect(countTwins(first.globalZone.modulators)).toBe(1);
        expect(countTwins(second.globalZone.modulators)).toBe(0);
    });

    it("leaves the elements that were in the bank before a paste alone", () => {
        const session = createTestSession();
        const [first] = session.document.instruments;
        first.globalZone.setModulators([resonanceModulator()]);
        publishSetUp(session);
        const existing = new Set([
            ...session.document.instruments,
            ...session.document.presets
        ]);

        // A paste touches the instruments it shares only for their usedBy
        session.history.do([
            new EditModulatorsAction(first, first.globalZone, [
                ...first.globalZone.modulators
            ]),
            new SyncResonanceTwinsAction(existing)
        ]);

        expect(countTwins(first.globalZone.modulators)).toBe(0);
    });

    it("gives a bank that saves as DLS no twins, as core does not", () => {
        const file = getMirror(createTestSession()).bank.writeDLS();
        const host = createTestHost();
        const session = new BankSession(host.client, loadSoundBank(file));
        expect(session.document.bank.type).toBe("dls");
        const [instrument] = session.document.instruments;
        instrument.globalZone.setModulators([resonanceModulator()]);
        publishSetUp(session);

        session.history.do([
            sameDefaults(session),
            new SyncResonanceTwinsAction()
        ]);

        expect(countTwins(instrument.globalZone.modulators)).toBe(0);

        // Saved as SF2, core would give it the twin on the next load
        session.document.writeFormat = "sf2";
        session.history.do([
            sameDefaults(session),
            new SyncResonanceTwinsAction()
        ]);
        expect(countTwins(instrument.globalZone.modulators)).toBe(1);
        session.close();
    });

    it("is named after nothing, so the group keeps its name", () => {
        expect(new SyncResonanceTwinsAction().label).toBeUndefined();
    });
});
