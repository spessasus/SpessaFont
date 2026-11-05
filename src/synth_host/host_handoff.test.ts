import { describe, expect, it } from "vitest";
import {
    GeneratorTypes,
    MIDIBuilder,
    SpessaSynthProcessor,
    type BasicSoundBank
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    expectMirrorUpToDate,
    getMirror,
    moveTestHost,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { ReplaceSampleAudioAction } from "../sample_editor/replace_sample_audio_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { SynthClient } from "../core_backend/synth_client.ts";
import type { HostPort } from "./protocol.ts";

/**
 * Plays the same notes on the bank and returns the left output.
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

describe("SynthHost handoff", () => {
    it("rebuilds an edited bank that plays the same, and follows later edits", async () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        const { document } = session;
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
            new CreateZoneAction(
                document.presets[0],
                document.presets[0].zones[0],
                otherInstrument
            )
        ]);
        const audio = new Float32Array(4000).map((_, i) => Math.sin(i / 8));
        session.history.do([
            await ReplaceSampleAudioAction.create(session, sample, {
                data: audio,
                sampleRate: 22_050
            })
        ]);
        session.history.do([new DeletePresetAction(document.presets[1])]);
        const before = render(getMirror(session).bank);

        await moveTestHost(testHost);

        expectMirrorUpToDate(session);
        expect(render(getMirror(session).bank)).toEqual(before);
        expect([...(await session.readAudio(sample))]).toEqual([...audio]);
        session.history.do([
            new EditSampleAction(sample, "originalKey", sample.originalKey, 64)
        ]);
        expectMirrorUpToDate(session);
        session.history.undo();
        session.history.undo();
        expectMirrorUpToDate(session);
    });

    it("keeps a deleted sample's data for an undo after the move", async () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        const unused = session.document.bank.cloneSample(
            session.document.samples[0]
        );
        unused.name = "Unused";
        unused.setAudioData(new Float32Array([0.25, 0.5]), 44_100);
        publishSetUp(session);
        session.history.do([new DeleteSampleAction(unused)]);

        await moveTestHost(testHost);
        session.history.undo();

        expectMirrorUpToDate(session);
        expect([...(await session.readAudio(unused))]).toEqual([0.25, 0.5]);
    });

    it("keeps every open bank and plays the attached one", async () => {
        const testHost = createTestHost();
        const first = createTestSession(testHost);
        const second = createTestSession(testHost);
        second.attach();

        await moveTestHost(testHost);

        expectMirrorUpToDate(first);
        expectMirrorUpToDate(second);
        const main =
            testHost.host.processor.soundBankManager.soundBankList.find(
                (entry) => entry.id === "main"
            );
        expect(main?.soundBank).toBe(getMirror(second).bank);
    });

    it("keeps a paused song where it was", async () => {
        const testHost = createTestHost();
        const midi = new MIDIBuilder({ name: "song" });
        midi.noteOn(0, 0, 1, 60, 100);
        midi.noteOff(48_000, 0, 1, 60);
        midi.flush();
        await testHost.client.loadSong(midi.writeMIDI(), "song");
        testHost.host.sequencer.currentTime = 2;
        testHost.client.send({ type: "pause" });

        await moveTestHost(testHost);

        const { sequencer } = testHost.host;
        expect(sequencer.midiData?.getName()).toBe("song");
        expect(sequencer.paused).toBe(true);
        expect(sequencer.currentTime).toBeCloseTo(2, 1);
    });

    it("hands off after a save that is running", async () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        const save = testHost.client.write(session.id, {
            format: "sf4",
            convert: undefined,
            software: "test"
        });

        await moveTestHost(testHost);

        const result = await save;
        expect(result.binary?.byteLength).toBeGreaterThan(0);
        expectMirrorUpToDate(session);
    });
});

describe("SynthClient bank sizes", () => {
    it("reports the open banks' size before the host gets a new bank, and after one closes", () => {
        const order = new Array<string>();
        const port: HostPort = {
            postMessage: (message) => {
                if (
                    typeof message === "object" &&
                    message !== null &&
                    "type" in message &&
                    typeof message.type === "string"
                ) {
                    order.push(message.type);
                }
            },
            onmessage: null
        };
        const client = new SynthClient(port, (size) => {
            order.push(`size ${size}`);
        });
        const ids = { presets: [], instruments: [], samples: [] };

        void client.openBank(1, new ArrayBuffer(0), ids, 10);
        void client.openBank(2, new ArrayBuffer(0), ids, 5);
        client.closeBank(1);
        client.closeBank(1);

        expect(order).toEqual([
            "size 10",
            "openBank",
            "size 15",
            "openBank",
            "closeBank",
            "size 5",
            "closeBank"
        ]);
    });
});
