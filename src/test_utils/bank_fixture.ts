import {
    BasicSoundBank,
    type BasicZone,
    type Modulator,
    type ModulatorSource,
    SoundBankLoader,
    SpessaSynthProcessor
} from "spessasynth_core";
import { expect } from "vitest";
import { BankSession } from "../core_backend/bank_session.ts";
import { loadSoundBank } from "../core_backend/load_sound_bank.ts";
import type { BankViews } from "../core_backend/entity_views.ts";
import { ChangeSet } from "../core_backend/change_set.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import type { SynthHost } from "../core_backend/synth_binding.ts";

/**
 * Suffix appended to every element of the second copy of the sample bank,
 * so names stay unique and the snapshot can refer to elements by name.
 */
export const SECOND_COPY_SUFFIX = " 2";

/**
 * `AudioEngine`'s bank handling on a bare processor, since the engine needs Web Audio.
 */
export class ProcessorHost implements SynthHost {
    public readonly processor = new SpessaSynthProcessor(44_100);
    public refreshCount = 0;
    public clearCount = 0;

    public isBankAttached(bank: BasicSoundBank) {
        return (
            this.processor.soundBankManager.soundBankList[0]?.soundBank === bank
        );
    }

    public attachBank(bank: BasicSoundBank) {
        this.processor.soundBankManager.addSoundBank(bank, "main");
        this.refreshPresets();
    }

    public detachBank(bank: BasicSoundBank) {
        if (!this.isBankAttached(bank)) {
            return;
        }
        this.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(
                BasicSoundBank.getSampleSoundBankFile()
            ),
            "main"
        );
        this.refreshPresets();
    }

    public clearCache() {
        this.clearCount++;
        this.processor.clearCache();
    }

    public refreshPresets() {
        this.refreshCount++;
        this.processor.refreshPresets();
    }
}

/**
 * Two copies of the spessasynth_core sample bank as an SF2 file.
 */
function writeTestBankFile() {
    const bank = SoundBankLoader.fromArrayBuffer(
        BasicSoundBank.getSampleSoundBankFile()
    );
    const secondCopy = SoundBankLoader.fromArrayBuffer(
        BasicSoundBank.getSampleSoundBankFile()
    );
    const elements = [
        ...secondCopy.presets,
        ...secondCopy.instruments,
        ...secondCopy.samples
    ];
    for (const element of elements) {
        element.name += SECOND_COPY_SUFFIX;
    }
    for (const preset of secondCopy.presets) {
        bank.clonePreset(preset);
    }
    return bank.writeSF2();
}

const TEST_BANK_FILE = writeTestBankFile();

/**
 * Creates a session holding two copies of the spessasynth_core sample bank.
 * The result has two presets, two instruments and two mono samples,
 * which is enough to exercise linking, deleting and reordering.
 * Pass a host to check what the synthesizer sees.
 * The session opens the bank like a file, so the mirror loads the same file.
 */
export function createTestSession(host: SynthHost = new ProcessorHost()) {
    // Each session gets its own buffer, the mirror's samples point into it
    const loaded = loadSoundBank(TEST_BANK_FILE.slice());
    // Writing fills in a default name, a new bank has none
    loaded.bank.soundBankInfo.name = "";
    return new BankSession(host, loaded);
}

/**
 * Publishes changes a test made to the bank directly (outside the history) while setting up,
 * so the store's views and the mirror start from the set-up bank.
 */
export function publishSetUp(session: BankSession) {
    const changes = new ChangeSet();
    const { presets, instruments, samples } = session.document;
    changes.touch(...presets, ...instruments);
    // The test may have given a sample new audio, which the mirror reads from the sample
    for (const sample of samples) {
        changes.touchSampleAudio(sample);
    }
    changes.touchList("presets");
    changes.touchList("instruments");
    changes.touchList("samples");
    changes.touchBankInfo();
    session.store.commit(changes, session.store.getSnapshot().history);
}

/**
 * A map's insertion order depends on the edit history and means nothing, the orders do.
 */
function normalizeViews(views: BankViews) {
    return {
        ...views,
        presets: Object.fromEntries(views.presets),
        instruments: Object.fromEntries(views.instruments),
        samples: Object.fromEntries(views.samples)
    };
}

/**
 * Checks that the store's views, updated commit by commit, equal views built from scratch.
 * An action that forgets to touch something it changed fails here.
 */
export function expectViewsUpToDate(session: BankSession) {
    expect(normalizeViews(session.store.getSnapshot().views)).toEqual(
        normalizeViews(session.store.buildFreshViews())
    );
}

/**
 * The mirror builds zones in view order, so the "used by" lists (one entry per zone) can come
 * out in another order, which means nothing. An unset range keeps whatever maximum it had.
 */
export function normalizeForMirror(snapshot: ReturnType<typeof snapshotBank>) {
    const normalizeZone = <T extends ReturnType<typeof zoneSnapshot>>(
        zone: T
    ) => ({
        ...zone,
        keyRange: zone.keyRange.min === -1 ? undefined : zone.keyRange,
        velRange: zone.velRange.min === -1 ? undefined : zone.velRange
    });
    return {
        ...snapshot,
        presets: snapshot.presets.map((p) => ({
            ...p,
            globalZone: normalizeZone(p.globalZone),
            zones: p.zones.map((z) => normalizeZone(z))
        })),
        instruments: snapshot.instruments.map((i) => ({
            ...i,
            globalZone: normalizeZone(i.globalZone),
            zones: i.zones.map((z) => normalizeZone(z)),
            linkedTo: i.linkedTo.toSorted((a, b) => a.localeCompare(b))
        })),
        samples: snapshot.samples.map((s) => ({
            ...s,
            linkedTo: s.linkedTo.toSorted((a, b) => a.localeCompare(b))
        }))
    };
}

/**
 * Checks that the mirror, patched commit by commit, holds the same bank as the editor.
 */
export function expectMirrorUpToDate(session: BankSession) {
    expect(normalizeForMirror(snapshotBank(session.mirror.bank))).toEqual(
        normalizeForMirror(snapshotBank(session.document.bank))
    );
}

function sourceSnapshot(source: ModulatorSource) {
    return {
        index: source.index,
        isCC: source.isCC,
        isBipolar: source.isBipolar,
        isNegative: source.isNegative,
        curveType: source.curveType
    };
}

function modulatorSnapshot(modulator: Modulator) {
    return {
        primary: sourceSnapshot(modulator.primarySource),
        secondary: sourceSnapshot(modulator.secondarySource),
        destination: modulator.destination,
        amount: modulator.transformAmount,
        transformType: modulator.transformType
    };
}

function zoneSnapshot(zone: BasicZone) {
    return {
        keyRange: { ...zone.keyRange },
        velRange: { ...zone.velRange },
        generators: zone.generators.map((g) => ({
            type: g.type,
            value: g.value
        })),
        modulators: zone.modulators.map((m) => modulatorSnapshot(m))
    };
}

/**
 * Captures everything an edit can change as plain data, in order.
 * References between elements are stored by name, so two snapshots are equal
 * when the bank has the same contents and structure, even if objects were recreated.
 */
export function snapshotBank(bank: BasicSoundBank) {
    return {
        info: { ...bank.soundBankInfo },
        defaultModulators: bank.defaultModulators.map((m) =>
            modulatorSnapshot(m)
        ),
        presets: bank.presets.map((p) => ({
            name: p.name,
            program: p.program,
            bankMSB: p.bankMSB,
            bankLSB: p.bankLSB,
            isGMGSDrum: p.isGMGSDrum,
            globalZone: zoneSnapshot(p.globalZone),
            zones: p.zones.map((z) => ({
                ...zoneSnapshot(z),
                instrument: z.instrument.name
            }))
        })),
        instruments: bank.instruments.map((i) => ({
            name: i.name,
            globalZone: zoneSnapshot(i.globalZone),
            zones: i.zones.map((z) => ({
                ...zoneSnapshot(z),
                sample: z.sample.name
            })),
            linkedTo: i.linkedTo.map((p) => p.name)
        })),
        samples: bank.samples.map((s) => ({
            name: s.name,
            sampleRate: s.sampleRate,
            originalKey: s.originalKey,
            pitchCorrection: s.pitchCorrection,
            sampleType: s.sampleType,
            linkedSample: s.linkedSample?.name,
            loopStart: s.loopStart,
            loopEnd: s.loopEnd,
            linkedTo: s.linkedTo.map((i) => i.name)
        }))
    };
}

/**
 * Applies the actions through the history, then checks that undo restores the
 * original bank and redo restores the edited one.
 * Returns both snapshots so the caller can assert what the edit changed,
 * and the focus hint of each step.
 * The store's views are checked against a fresh build after each step.
 * Pass a function when building the actions changes the bank already,
 * for example because new zones link their children on creation.
 */
export function expectRoundTrip(
    session: BankSession,
    actions: HistoryActionGroup | (() => HistoryActionGroup)
) {
    const bank = session.document.bank;
    const before = snapshotBank(bank);
    const group = typeof actions === "function" ? actions() : actions;
    const doFocus = session.history.do(group);
    const after = snapshotBank(bank);
    expect(after).not.toEqual(before);
    expectViewsUpToDate(session);
    expectMirrorUpToDate(session);

    const undoFocus = session.history.undo();
    expect(snapshotBank(bank)).toEqual(before);
    expectViewsUpToDate(session);
    expectMirrorUpToDate(session);

    const redoFocus = session.history.redo();
    expect(snapshotBank(bank)).toEqual(after);
    expectViewsUpToDate(session);
    expectMirrorUpToDate(session);
    return { before, after, doFocus, undoFocus, redoFocus };
}
