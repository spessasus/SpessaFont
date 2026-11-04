import { describe, expect, it } from "vitest";
import {
    type BasicSoundBank,
    GeneratorTypes,
    SoundBankLoader,
    SpessaSynthProcessor
} from "spessasynth_core";
import {
    createTestSession,
    expectMirrorUpToDate,
    expectRoundTrip,
    normalizeForMirror,
    publishSetUp,
    snapshotBank
} from "../test_utils/bank_fixture.ts";
import { getObjectId } from "../utils/object_id.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { ReplaceSampleAudioAction } from "../sample_editor/replace_sample_audio_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";

type TestSession = ReturnType<typeof createTestSession>;

function getFirstMirrorSample(session: TestSession) {
    const id = getObjectId(session.document.samples[0]);
    const sample = session.mirror.getSample(id);
    if (!sample) {
        throw new Error("The mirror has no such sample.");
    }
    return sample;
}

/**
 * A few edits of every kind, so the comparisons below cover more than a fresh load.
 */
async function editBank(session: TestSession) {
    const { document } = session;
    const [preset] = document.presets;
    const [instrument, otherInstrument] = document.instruments;
    const [sample] = document.samples;
    session.history.do([
        new SetGeneratorAction(
            instrument,
            instrument.zones[0],
            GeneratorTypes.initialFilterFc,
            null,
            6000
        )
    ]);
    session.history.do([
        new CreateZoneAction(preset, preset.zones[0], otherInstrument)
    ]);
    session.history.do([
        new EditSampleAction(sample, "originalKey", sample.originalKey, 64)
    ]);
    const audio = new Float32Array(4000).map((_, i) => Math.sin(i / 8));
    session.history.do([
        await ReplaceSampleAudioAction.create(session, sample, {
            data: audio,
            sampleRate: 22_050
        })
    ]);
    session.history.do([new DeletePresetAction(document.presets[1])]);
}

/**
 * Plays the same notes on each bank and returns the left output.
 */
function render(bank: BasicSoundBank) {
    const processor = new SpessaSynthProcessor(44_100);
    processor.soundBankManager.addSoundBank(bank, "main");
    processor.refreshPresets();
    for (const note of [48, 60, 67]) {
        processor.noteOn(0, note, 100);
    }
    const left = new Float32Array(128 * 64);
    const right = new Float32Array(128 * 64);
    for (let offset = 0; offset < left.length; offset += 128) {
        processor.process(
            left.subarray(offset, offset + 128),
            right.subarray(offset, offset + 128)
        );
    }
    return left;
}

describe("BankMirror", () => {
    it("matches the editor's bank once loaded, which the editor sorted", () => {
        expectMirrorUpToDate(createTestSession());
    });

    it("plays the same as a fresh load of the file it writes, after edits", async () => {
        const session = createTestSession();
        await editBank(session);

        const fromMirror = render(session.mirror.bank);
        const reloaded = SoundBankLoader.fromArrayBuffer(
            session.mirror.bank.writeSF2()
        );

        expect(fromMirror.some((v) => v !== 0)).toBe(true);
        // The replaced float audio is written as 16-bit, which rounds it a little
        const fromFile = render(reloaded);
        const difference = Math.max(
            ...fromMirror.map((v, i) => Math.abs(v - fromFile[i]))
        );
        expect(difference).toBeLessThan(0.001);
    });

    it("writes a file that holds the editor's bank, after edits", async () => {
        const session = createTestSession();
        // Writing fills in a default for an empty name
        session.document.bank.soundBankInfo.name = "Named";
        publishSetUp(session);
        await editBank(session);

        const reloaded = SoundBankLoader.fromArrayBuffer(
            session.mirror.bank.writeSF2(),
            { sampleData: false }
        );

        // The file's elements come in the editor's order, so they compare one to one
        expect(normalizeForMirror(snapshotBank(reloaded))).toEqual(
            normalizeForMirror(snapshotBank(session.document.bank))
        );
    });

    it("gets the new audio of a replaced sample, and the old one back on undo", async () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const before = getFirstMirrorSample(session).getAudioData().slice();
        const audio = new Float32Array(100).fill(0.5);

        expectRoundTrip(session, [
            await ReplaceSampleAudioAction.create(session, sample, {
                data: audio,
                sampleRate: 44_100
            })
        ]);
        expect(getFirstMirrorSample(session).getAudioData()).toEqual(audio);

        session.history.undo();
        expect(getFirstMirrorSample(session).getAudioData()).toEqual(before);
    });

    it("keeps a deleted sample's data for the undo that brings it back", async () => {
        const session = createTestSession();
        const { bank } = session.document;
        const unused = bank.cloneSample(session.document.samples[0]);
        unused.name = "Unused";
        unused.setAudioData(new Float32Array([0.25, 0.5]), 44_100);
        publishSetUp(session);

        session.history.do([new DeleteSampleAction(unused)]);
        session.history.undo();

        expectMirrorUpToDate(session);
        expect([...(await session.readAudio(unused))]).toEqual([0.25, 0.5]);
    });
});
