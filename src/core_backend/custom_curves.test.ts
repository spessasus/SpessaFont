import { describe, expect, it } from "vitest";
import {
    CustomCurve,
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource,
    SoundBankLoader,
    SPESSASYNTH_DEFAULT_MODULATORS
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    expectMirrorUpToDate,
    expectRoundTrip,
    getMirror,
    moveTestHost,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { BankSession } from "./bank_session.ts";
import { ClipboardManager } from "./clipboard_manager.ts";
import { loadSoundBank } from "./load_sound_bank.ts";
import { EditModulatorsAction } from "../generator_table/modulator_edit/edit_modulators_action.ts";
import { SetDefaultModulatorsAction } from "../info_view/default_modulators/set_default_modulators_action.ts";

const POINTS = [
    { x: 0, y: 0 },
    { x: 8000, y: 12_000 },
    { x: 16_383, y: 16_384 }
];

function curveModulator(curve: CustomCurve) {
    return new Modulator(
        new ModulatorSource(MIDIControllers.modulationWheel, curve, true),
        new ModulatorSource(),
        GeneratorTypes.fineTune,
        50,
        0
    );
}

function getCurves(modulators: readonly Modulator[]) {
    return modulators.flatMap((m) =>
        [m.primarySource.curve, m.secondarySource.curve].filter(
            (c) => c instanceof CustomCurve
        )
    );
}

describe("custom curves", () => {
    it("keeps the curves of the default modulators in the mirror after an edit", () => {
        const session = createTestSession();
        const { bank } = session.document;
        expect(getCurves(bank.defaultModulators).length).toBeGreaterThan(0);

        const edited = Modulator.copyFrom(bank.defaultModulators[0]);
        edited.transformAmount += 1;
        expectRoundTrip(session, [
            new SetDefaultModulatorsAction(bank.defaultModulators, [
                edited,
                ...bank.defaultModulators.slice(1)
            ])
        ]);

        const mirror = getMirror(session).bank;
        const mirrored = getCurves(mirror.defaultModulators);
        expect(mirrored).toHaveLength(getCurves(bank.defaultModulators).length);
        // The mirror's modulators use the curves of the mirror's bank
        expect(mirrored.every((c) => mirror.customCurves.includes(c))).toBe(
            true
        );
    });

    it("gives a zone modulator from another bank a curve of this bank, which undo takes out", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const [instrument] = session.document.instruments;
        const foreign = new CustomCurve(POINTS, "Foreign");
        const count = bank.customCurves.length;

        const { after } = expectRoundTrip(session, [
            new EditModulatorsAction(instrument, instrument.globalZone, [
                curveModulator(foreign)
            ])
        ]);

        expect(after.customCurves).toHaveLength(count + 1);
        const [own] = getCurves(instrument.globalZone.modulators);
        expect(own).not.toBe(foreign);
        expect(own.points).toEqual(POINTS);
        expect(bank.customCurves).toContain(own);
        // What the mirror writes reads back with the curve
        const written = SoundBankLoader.fromArrayBuffer(
            getMirror(session).bank.writeSFe()
        );
        expect(written.customCurves.map((c) => c.name)).toContain("Foreign");
    });

    it("brings the same curve back on redo, for elements that share it", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const [instrument] = session.document.instruments;
        const pasted = curveModulator(new CustomCurve(POINTS, "Foreign"));
        session.history.do([
            new EditModulatorsAction(instrument, instrument.globalZone, [
                pasted
            ])
        ]);
        const [own] = getCurves(instrument.globalZone.modulators);
        const clipboard = new ClipboardManager();
        session.history.do(
            clipboard.cloneElements(session, { instruments: [instrument] })
        );

        session.history.undo();
        session.history.undo();
        expect(bank.customCurves).not.toContain(own);
        session.history.redo();
        session.history.redo();

        expect(bank.customCurves).toContain(own);
        const duplicate = session.document.instruments.at(-1);
        expect(getCurves(duplicate?.globalZone.modulators ?? [])).toEqual([
            own
        ]);
        expectMirrorUpToDate(session);
        // Throws when a modulator uses a curve the bank does not list
        expect(() => getMirror(session).bank.writeSFe()).not.toThrow();
    });

    it("uses an equal curve of the bank instead of a second copy", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const [instrument] = session.document.instruments;
        const [existing] = bank.customCurves;
        const twin = new CustomCurve(existing.points, existing.name);
        const count = bank.customCurves.length;

        session.history.do([
            new EditModulatorsAction(instrument, instrument.globalZone, [
                curveModulator(twin)
            ])
        ]);

        expect(bank.customCurves).toHaveLength(count);
        expect(getCurves(instrument.globalZone.modulators)).toEqual([existing]);
        expectMirrorUpToDate(session);
    });

    it("pastes an instrument with its curve into another bank as one undo step", () => {
        const host = createTestHost();
        const source = createTestSession(host);
        const target = createTestSession(host);
        const [instrument] = source.document.instruments;
        const curve = new CustomCurve(POINTS, "Pasted");
        source.document.bank.addCustomCurves(curve);
        instrument.globalZone.setModulators([curveModulator(curve)]);
        publishSetUp(source);
        const clipboard = new ClipboardManager();
        clipboard.copyInstruments(new Set([instrument]), source);
        const count = target.document.bank.customCurves.length;

        const { after } = expectRoundTrip(target, () =>
            clipboard.pasteInstruments(target)
        );

        expect(after.customCurves).toHaveLength(count + 1);
        const pasted = target.document.instruments.at(-1);
        const [own] = getCurves(pasted?.globalZone.modulators ?? []);
        expect(target.document.bank.customCurves).toContain(own);
        expect(own).not.toBe(curve);
    });
});

describe("custom curves of a default modulator reset", () => {
    it("brings the standard curves back to a bank that lost them", () => {
        const session = createTestSession();
        const { document } = session;
        document.bank.defaultModulators = [];
        document.removeCustomCurves([...document.bank.customCurves]);
        publishSetUp(session);
        expect(document.bank.customCurves).toHaveLength(0);

        // Copies, as core's list is frozen
        const standard = SPESSASYNTH_DEFAULT_MODULATORS.map((m) =>
            Modulator.copyFrom(m)
        );
        expectRoundTrip(session, [
            new SetDefaultModulatorsAction([], standard)
        ]);

        const used = getCurves(document.bank.defaultModulators);
        expect(used.length).toBeGreaterThan(0);
        for (const curve of used) {
            expect(document.bank.customCurves).toContain(curve);
        }
        // One curve per standard curve, however many modulators share it
        expect(document.bank.customCurves).toHaveLength(new Set(used).size);
    });
});

describe("custom curves of a stereo column", () => {
    it("gives both zones one adopted curve when a modulator from another bank is pasted", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = instrument.zones;
        const count = session.document.bank.customCurves.length;
        // A curve of another bank, as the modulator editor pastes it into a pair
        const foreign = curveModulator(new CustomCurve(POINTS, "Pair"));

        expectRoundTrip(session, [
            new EditModulatorsAction(instrument, left, [foreign]),
            new EditModulatorsAction(instrument, right, [
                Modulator.copyFrom(foreign)
            ])
        ]);

        expect(session.document.bank.customCurves).toHaveLength(count + 1);
        const [leftCurve] = getCurves(left.modulators);
        const [rightCurve] = getCurves(right.modulators);
        expect(leftCurve).toBe(rightCurve);
        expect(session.document.bank.customCurves).toContain(leftCurve);
    });
});

describe("custom curves after a host move", () => {
    it("keeps a pasted curve through the move, an undo and a redo", async () => {
        const host = createTestHost();
        const source = createTestSession(host);
        const target = createTestSession(host);
        const [instrument] = source.document.instruments;
        const curve = new CustomCurve(POINTS, "Moved");
        source.document.bank.addCustomCurves(curve);
        instrument.globalZone.setModulators([curveModulator(curve)]);
        publishSetUp(source);
        const clipboard = new ClipboardManager();
        clipboard.copyInstruments(new Set([instrument]), source);
        target.history.do(clipboard.pasteInstruments(target));
        const count = target.document.bank.customCurves.length;

        await moveTestHost(host);
        expectMirrorUpToDate(target);
        target.history.undo();
        expect(target.document.bank.customCurves).toHaveLength(count - 1);
        expectMirrorUpToDate(target);
        target.history.redo();
        expect(target.document.bank.customCurves).toHaveLength(count);
        expectMirrorUpToDate(target);
        const pasted = target.document.instruments.at(-1);
        const [own] = getCurves(pasted?.globalZone.modulators ?? []);
        expect(
            getMirror(target).bank.customCurves.map((c) => c.name)
        ).toContain(own?.name);
    });
});

describe("SF2 send amounts", () => {
    it("are read scaled in both the editor and the mirror", () => {
        const first = createTestSession();
        const mirror = getMirror(first).bank;
        // CC 91 to the reverb send, as the SoundFont 2 default modulator has it
        mirror.instruments[0].globalZone.addModulators(
            new Modulator(
                new ModulatorSource(MIDIControllers.reverbDepth, 0, true),
                new ModulatorSource(),
                GeneratorTypes.reverbEffectsSend,
                300,
                0
            )
        );
        const file = mirror.writeSF2();

        const host = createTestHost();
        const session = new BankSession(host.client, loadSoundBank(file));
        const getSend = (instrument: {
            globalZone: { modulators: readonly Modulator[] };
        }) =>
            instrument.globalZone.modulators.find(
                (m) => m.destination === GeneratorTypes.reverbEffectsSend
            );
        const edited = getSend(session.document.instruments[0]);
        const mirrored = getSend(
            host.host.getMirrorOf(session.id).bank.instruments[0]
        );
        expect(edited?.transformAmount).toBe(300);
        expect(mirrored?.transformAmount).toBe(300);
    });
});
