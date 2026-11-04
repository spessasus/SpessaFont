import { afterEach, describe, expect, it, vi } from "vitest";
import {
    BasicPreset,
    GeneratorTypes,
    MIDIMessageTypes
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
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

/**
 * A host behind a real MessageChannel, as the app runs it before it moves to a Worker.
 */
function createChannelHost() {
    const channel = new MessageChannel();
    const host = new SynthHost(channel.port2, {
        sampleRate: 44_100,
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
});
