import {
    BasicSoundBank,
    type BasicZone,
    type Modulator,
    type ModulatorSource,
    SoundBankLoader
} from "spessasynth_core";
import { expect, vi } from "vitest";
import { BankSession } from "../core_backend/bank_session.ts";
import { loadSoundBank } from "../core_backend/load_sound_bank.ts";
import type { BankViews } from "../core_backend/entity_views.ts";
import { ChangeSet } from "../core_backend/change_set.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { SynthClient } from "../core_backend/synth_client.ts";
import { getHostSettings } from "../core_backend/audio_engine.ts";
import { DEFAULT_SETTINGS } from "../settings/save_load/settings_typedef.ts";
import { SynthHost, type SynthHostOptions } from "../synth_host/synth_host.ts";
import type {
    HandoffEvent,
    HostCommand,
    HostHandoff,
    HostPort
} from "../synth_host/protocol.ts";

/**
 * Suffix appended to every element of the second copy of the sample bank,
 * so names stay unique and the snapshot can refer to elements by name.
 */
export const SECOND_COPY_SUFFIX = " 2";

/**
 * One end of a channel that delivers right away, with the copying and transfers of a real
 * MessagePort, so the action tests stay synchronous. Tests of the host's own timing use a real
 * MessageChannel.
 */
class LoopbackPort implements HostPort {
    public other: LoopbackPort | undefined;
    public onmessage: ((event: MessageEvent) => void) | null = null;

    public postMessage(message: unknown, transfer: Transferable[]) {
        const data: unknown = structuredClone(message, { transfer });
        this.other?.onmessage?.(new MessageEvent("message", { data }));
    }
}

export interface TestHost {
    host: SynthHost;
    client: SynthClient;
    clientEnd: LoopbackPort;
}

const TEST_HOST_OPTIONS: SynthHostOptions = {
    sampleRate: 44_100,
    queuedBlocks: 32,
    currentTime: 0,
    settings: getHostSettings(DEFAULT_SETTINGS),
    isVerbose: false
};

/**
 * A synthesizer host and its client, connected by loopback ports.
 */
export function createTestHost(): TestHost {
    const clientEnd = new LoopbackPort();
    const hostEnd = new LoopbackPort();
    clientEnd.other = hostEnd;
    hostEnd.other = clientEnd;
    const host = new SynthHost(hostEnd, TEST_HOST_OPTIONS);
    return { host, client: new SynthClient(clientEnd), clientEnd };
}

/**
 * Hands the host off to a new one, as a move to the other thread does. The old host's sample
 * data is transferred, so a test that still reads it fails.
 */
export async function moveTestHost(testHost: TestHost) {
    const { clientEnd } = testHost;
    const clientHandler = clientEnd.onmessage;
    let state: HostHandoff | undefined;
    clientEnd.onmessage = (event: MessageEvent<HandoffEvent>) => {
        if (event.data.type === "handOff") {
            state = event.data.state;
        } else {
            clientHandler?.(event);
        }
    };
    const command: HostCommand = { type: "handOff" };
    clientEnd.postMessage(command, []);
    // The host first waits for its running requests
    const handoff = await vi.waitFor(() => {
        if (!state) {
            throw new Error("The host has not handed off yet.");
        }
        return state;
    });
    clientEnd.onmessage = clientHandler;
    const hostEnd = new LoopbackPort();
    hostEnd.other = clientEnd;
    clientEnd.other = hostEnd;
    testHost.host = new SynthHost(hostEnd, {
        ...TEST_HOST_OPTIONS,
        handoff
    });
}

const testHosts = new WeakMap<BankSession, TestHost>();

/**
 * The host a test session was opened in.
 */
export function getTestHost(session: BankSession) {
    const testHost = testHosts.get(session);
    if (!testHost) {
        throw new Error("The session was not made by createTestSession.");
    }
    return testHost;
}

/**
 * The session's mirror in its host, which is what the synthesizer plays and saving writes.
 */
export function getMirror(session: BankSession) {
    return getTestHost(session).host.getMirrorOf(session.id);
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
 * Pass a host to open several sessions in one, as the app does.
 * The session opens the bank like a file, so the mirror loads the same file.
 */
export function createTestSession(testHost = createTestHost()) {
    // Each session gets its own buffer, which moves to the host
    const loaded = loadSoundBank(TEST_BANK_FILE.slice());
    // Writing fills in a default name, a new bank has none
    loaded.bank.soundBankInfo.name = "";
    const session = new BankSession(testHost.client, loaded);
    testHosts.set(session, testHost);
    return session;
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
    const mirrored = snapshotBank(getMirror(session).bank);
    expect(normalizeForMirror(mirrored)).toEqual(
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
        isXGBank: bank.isXGBank,
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
