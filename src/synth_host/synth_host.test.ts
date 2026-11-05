import { afterEach, describe, expect, it, vi } from "vitest";
import {
    BasicPreset,
    EmptySample,
    GeneratorTypes,
    MIDIBuilder,
    MIDIMessageTypes
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    getMirror,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { ChangeSet } from "../core_backend/change_set.ts";
import { SynthClient } from "../core_backend/synth_client.ts";
import { BankSession } from "../core_backend/bank_session.ts";
import { getHostSettings } from "../core_backend/audio_engine.ts";
import { DEFAULT_SETTINGS } from "../settings/save_load/settings_typedef.ts";
import { getObjectId } from "../utils/object_id.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { SynthHost } from "./synth_host.ts";
import type { HostPort } from "./protocol.ts";
import type { PlaybackReport } from "./playback_worklet.ts";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import { loadNewBank } from "../core_backend/load_sound_bank.ts";

function createAttachedSession() {
    const testHost = createTestHost();
    const session = createTestSession(testHost);
    session.attach();
    const { processor } = testHost.host;
    return {
        session,
        processor,
        refresh: vi.spyOn(processor, "refreshPresets"),
        clear: vi.spyOn(processor, "clearCache")
    };
}

describe("SynthHost with the history", () => {
    it("lets a program change find a preset added after the bank was attached", () => {
        const { session, processor } = createAttachedSession();
        const { bank } = session.document;
        const preset = new BasicPreset(bank);
        preset.name = "Program 7";
        preset.program = 7;
        preset.createZone(bank.instruments[0]);

        session.history.do([new CreatePresetAction(preset)]);
        processor.programChange(3, 7);

        expect(processor.midiChannels[3].preset?.name).toBe("Program 7");
    });

    it("stops a program change from finding a deleted preset", () => {
        const { session, processor } = createAttachedSession();
        const { bank } = session.document;
        const preset = new BasicPreset(bank);
        preset.name = "Program 9";
        preset.program = 9;
        preset.createZone(bank.instruments[0]);
        session.history.do([new CreatePresetAction(preset)]);
        // Attaching again puts it in the synth's list either way
        session.attach();

        session.history.do([new DeletePresetAction(preset)]);
        processor.programChange(3, 9);

        expect(processor.midiChannels[3].preset?.name).not.toBe("Program 9");
    });

    it("gives the synth the zones a preset has after an edit", () => {
        const { session, processor } = createAttachedSession();
        const [preset] = session.document.presets;

        session.history.do([
            new CreateZoneAction(
                preset,
                preset.zones[0],
                session.document.instruments[1]
            )
        ]);
        processor.programChange(3, preset.program);

        // The added zone plays too, so the synth uses the new zone list
        expect(
            processor.midiChannels[3].preset?.getVoiceParameters(60, 64).length
        ).toBe(preset.getVoiceParameters(60, 64).length);
    });

    it("finds a preset added outside the history once the change is published", () => {
        const { session, processor } = createAttachedSession();
        const { bank } = session.document;
        const preset = new BasicPreset(bank);
        preset.name = "Program 5";
        preset.program = 5;
        preset.createZone(bank.instruments[0]);
        bank.addPresets(preset);

        publishSetUp(session);
        processor.programChange(3, 5);

        expect(processor.midiChannels[3].preset?.name).toBe("Program 5");
    });

    it("only clears the cache for an edit that leaves the presets alone", () => {
        const { session, refresh, clear } = createAttachedSession();
        const [instrument] = session.document.instruments;

        session.history.do([
            new SetGeneratorAction(
                instrument,
                instrument.zones[0],
                GeneratorTypes.initialAttenuation,
                null,
                100
            )
        ]);

        expect(refresh).not.toHaveBeenCalled();
        expect(clear).toHaveBeenCalledTimes(1);
    });

    it("does nothing for a commit that changed no view", () => {
        const { session, refresh, clear } = createAttachedSession();
        const changes = new ChangeSet();
        changes.touch(session.document.presets[0]);

        session.store.commit(changes, session.store.getSnapshot().history);

        expect(refresh).not.toHaveBeenCalled();
        expect(clear).not.toHaveBeenCalled();
    });

    it("leaves the preset list of a detached bank alone", () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        const refresh = vi.spyOn(testHost.host.processor, "refreshPresets");
        const clear = vi.spyOn(testHost.host.processor, "clearCache");
        const [sample] = session.document.samples;
        const [preset] = session.document.presets;

        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Renamed")
        ]);
        session.history.do([
            new SetGeneratorAction(
                preset,
                preset.zones[0],
                GeneratorTypes.initialAttenuation,
                null,
                100
            )
        ]);

        expect(refresh).not.toHaveBeenCalled();
        expect(clear).toHaveBeenCalledTimes(2);
    });

    it("stops telling the synthesizer about edits once the session is closed", () => {
        const { session, refresh, clear } = createAttachedSession();
        session.close();
        refresh.mockClear();
        clear.mockClear();

        publishSetUp(session);

        expect(refresh).not.toHaveBeenCalled();
        expect(clear).not.toHaveBeenCalled();
    });
});

describe("SynthHost sample data", () => {
    it("answers a stored data read with that sample's bytes only", async () => {
        const session = createTestSession();
        const [sample] = session.document.samples;

        const stored = await session.readStoredData(sample);

        // The mirror's samples are views into the whole file
        expect(stored.data.byteLength).toBeGreaterThan(0);
        expect(stored.data.buffer.byteLength).toBe(stored.data.byteLength);
    });

    it("answers an audio read with a copy and keeps nothing decoded", async () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const mirrorSample = getMirror(session).getSample(getObjectId(sample));

        const audio = await session.readAudio(sample);

        expect(audio.length).toBe(sample.sampleLength);
        expect(audio.buffer.byteLength).toBe(audio.byteLength);
        // Nothing left to drop
        expect(mirrorSample?.releaseDecoded()).toBe(false);
    });

    it("forgets a removed sample once the editor lets go of it", () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        const imported = new EmptySample();
        imported.setAudioData(new Float32Array(100), 44_100);
        session.history.do([new CreateSampleAction(imported)]);
        session.history.undo();
        const id = getObjectId(imported);
        const kept = getObjectId(session.document.samples[0]);
        expect(getMirror(session).getSample(id)?.hasData).toBe(true);

        // What the editor sends when the sample was garbage collected
        testHost.client.send({
            type: "releaseSamples",
            sessionId: session.id,
            ids: [id, kept]
        });

        expect(getMirror(session).getSample(id)).toBeUndefined();
        // A sample still in the bank stays
        expect(getMirror(session).getSample(kept)?.hasData).toBe(true);
    });
});

describe("SynthHost errors", () => {
    it("reports a command that failed", () => {
        const testHost = createTestHost();
        const errors = new Array<string>();
        testHost.client.hostErrors.subscribe((message) => {
            errors.push(message);
        });

        testHost.client.attach(999);

        expect(errors).toEqual(["No bank is open for session 999."]);
    });

    it("rejects the opening of a bank the host cannot load, and drops its patches", async () => {
        const testHost = createTestHost();
        const errors = new Array<string>();
        testHost.client.hostErrors.subscribe((message) => {
            errors.push(message);
        });
        const { bank } = loadNewBank();

        const session = new BankSession(testHost.client, {
            bank,
            file: new ArrayBuffer(16),
            has24BitSamples: false
        });

        await expect(session.opened).rejects.toThrow();
        expect(errors).toEqual([]);
        session.close();
    });

    it("rejects pending requests when the host failed", async () => {
        const port: HostPort = {
            postMessage: () => undefined,
            onmessage: null
        };
        const client = new SynthClient(port);
        const errors = new Array<string>();
        client.hostErrors.subscribe((message) => {
            errors.push(message);
        });
        const read = client.readAudio(1, 1);

        port.onmessage?.(
            new MessageEvent("message", {
                data: { type: "hostFailed", message: "Out of memory" }
            })
        );

        await expect(read).rejects.toThrow("Out of memory");
        expect(errors).toEqual(["Out of memory"]);
    });
});

/**
 * A host behind a real MessageChannel, as the app runs it before it moves to a Worker.
 */
function createChannelHost(sampleRate = 44_100, queuedBlocks = 32) {
    const channel = new MessageChannel();
    const host = new SynthHost(channel.port2, {
        sampleRate,
        queuedBlocks,
        currentTime: 0,
        settings: getHostSettings(DEFAULT_SETTINGS),
        isVerbose: false
    });
    const client = new SynthClient(channel.port1);
    openChannels.push(channel);
    return { host, client };
}

const openChannels = new Array<MessageChannel>();

describe("SynthHost over a MessageChannel", () => {
    afterEach(() => {
        for (const channel of openChannels.splice(0)) {
            channel.port1.close();
            channel.port2.close();
        }
    });

    it("sends synth events and the keyboard channel's values back", async () => {
        const { client } = createChannelHost();
        const events = new Array<string>();
        client.synthEvents.subscribe((e) => {
            events.push(e.type);
        });

        client.midi([
            MIDIMessageTypes.noteOn | KEYBOARD_TARGET_CHANNEL,
            60,
            100
        ]);
        client.send({
            type: "pitchWheel",
            channel: KEYBOARD_TARGET_CHANNEL,
            value: 10_000
        });
        // Messages take a turn of the event loop each way
        await vi.waitFor(() => {
            expect(events).toContain("noteOn");
            expect(client.keyboardChannel.getSnapshot().pitchWheel).toBe(
                10_000
            );
        });
    });

    it("answers audio reads after the edits sent before them", async () => {
        const { client } = createChannelHost();
        const session = new BankSession(client);
        const [sample] = session.document.samples;
        sample.setAudioData(new Float32Array([0.5, -0.5]), 44_100);
        publishSetUp(session);

        const audio = await session.readAudio(sample);

        expect([...audio]).toEqual([0.5, -0.5]);
    });

    it("plays the preview of one session after another was opened", async () => {
        const { host, client } = createChannelHost();
        const first = new BankSession(client);
        const second = new BankSession(client);
        second.attach();
        const [sample] = second.document.samples;

        second.setPreviewTarget({ kind: "sample", id: getObjectId(sample) });
        await vi.waitFor(() => {
            const channel =
                host.processor.midiChannels[KEYBOARD_TARGET_CHANNEL];
            expect(channel.preset?.name).toBe("PREVIEW PRESET");
        });
        first.close();
        second.close();
    });

    it("keeps the playback queue at its size when reports waited, at any rate", async () => {
        // Firefox's queue at 192 kHz, four times the blocks of 48 kHz
        const { client } = createChannelHost(192_000, 64);
        const output = new MessageChannel();
        openChannels.push(output);
        let received = 0;
        output.port1.onmessage = (e: MessageEvent<Float32Array[]>) => {
            received += e.data.length;
        };
        client.send({ type: "connectOutput", port: output.port2 }, [
            output.port2
        ]);
        const report = (played: number) => {
            const message: PlaybackReport = { played, underruns: 0 };
            output.port1.postMessage(message);
        };

        // What piles up while the host is busy: reports from before any chunk arrived
        for (let i = 0; i < 300; i++) {
            report(0);
        }
        // Answered after all of those, with what the queue has room for
        report(10);

        await vi.waitFor(() => {
            expect(received).toBeGreaterThanOrEqual(258);
        });
        expect(received).toBe(258);
    });

    it("writes a bank and moves the file back", async () => {
        const { client } = createChannelHost();
        const session = new BankSession(client);

        const result = await client.write(session.id, {
            format: "sf2",
            convert: undefined,
            software: "test"
        });

        expect(result.error).toBeUndefined();
        expect(result.binary?.byteLength).toBeGreaterThan(0);
    });

    it("plays a MIDI file it parsed itself, and reports a broken one", async () => {
        const { host, client } = createChannelHost();
        const midi = new MIDIBuilder({ name: "song" });
        midi.noteOn(0, 0, 1, 60, 100);
        midi.noteOff(480, 0, 1, 60);
        midi.flush();
        const file = midi.writeMIDI();

        await client.loadSong(file, "song");
        expect(host.sequencer.paused).toBe(false);
        // The file moved to the host
        expect(file.byteLength).toBe(0);

        await expect(
            client.loadSong(new Uint8Array([1, 2, 3, 4]).buffer, "broken")
        ).rejects.toThrow();
    });
});
