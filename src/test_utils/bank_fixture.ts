import {
    BasicSoundBank,
    type BasicZone,
    type Modulator,
    type ModulatorSource,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { expect } from "vitest";
import SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";

/**
 * Suffix appended to every element of the second copy of the sample bank,
 * so names stay unique and the snapshot can refer to elements by name.
 */
export const SECOND_COPY_SUFFIX = " 2";

/**
 * Creates a manager holding two copies of the spessasynth_core sample bank.
 * The result has two presets, two instruments and two mono samples,
 * which is enough to exercise linking, deleting and reordering.
 */
export function createTestManager() {
    const processor = new SpessaSynthProcessor(44_100);
    const sequencer = new SpessaSynthSequencer(processor);
    const manager = new SoundBankManager(processor, sequencer);

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
        manager.clonePreset(preset);
    }
    manager.sortElements();
    return manager;
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
 * Applies the actions through the manager, then checks that undo restores the
 * original bank and redo restores the edited one.
 * Returns both snapshots so the caller can assert what the edit changed.
 */
export function expectRoundTrip(
    manager: SoundBankManager,
    actions: HistoryActionGroup
) {
    const before = snapshotBank(manager);
    manager.modifyBank(actions);
    const after = snapshotBank(manager);
    expect(after).not.toEqual(before);

    manager.undo();
    expect(snapshotBank(manager)).toEqual(before);

    manager.redo();
    expect(snapshotBank(manager)).toEqual(after);
    return { before, after };
}
