import { describe, expect, it } from "vitest";
import {
    BasicPreset,
    BasicSoundBank,
    MIDIBuilder,
    type MIDIChannel,
    SoundBankLoader
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    getMirror,
    type TestHost
} from "../test_utils/bank_fixture.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { EditPresetAction } from "../preset_editor/bottom_bar/edit_preset_action.ts";
import { getObjectId } from "../utils/object_id.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";

const PREVIEW = "PREVIEW PRESET";

function getPresetBank(channel: MIDIChannel) {
    const { preset } = channel;
    return preset instanceof BasicPreset ? preset.parentSoundBank : undefined;
}

function render(testHost: TestHost, blocks: number) {
    const { host } = testHost;
    for (let i = 0; i < blocks; i++) {
        host.sequencer.processTick();
        host.processor.process(new Float32Array(128), new Float32Array(128));
    }
}

/**
 * A song that sets a channel's volume once at the start and plays notes on it.
 */
function buildSong(channel: number) {
    const midi = new MIDIBuilder({ name: "song" });
    midi.controllerChange(0, 0, channel, 7, 30);
    midi.programChange(0, 0, channel, 0);
    for (let i = 0; i < 40; i++) {
        midi.noteOn(i * 240, 0, channel, 60, 100);
        midi.noteOff(i * 240 + 200, 0, channel, 60);
    }
    midi.flush();
    return midi.writeMIDI();
}

function playSong(testHost: TestHost, file: ArrayBuffer) {
    void testHost.client.loadSong(file, "song");
    render(testHost, 100);
}

/**
 * An attached session whose keyboard previews its first sample.
 */
function createPreviewSession() {
    const testHost = createTestHost();
    const session = createTestSession(testHost);
    session.attach();
    const [sample] = session.document.samples;
    session.setPreviewTarget({ kind: "sample", id: getObjectId(sample) });
    const channel =
        testHost.host.processor.midiChannels[KEYBOARD_TARGET_CHANNEL];
    return { testHost, session, channel };
}

describe("the keyboard channel with a song", () => {
    it("stays the song's when the shown element or a preset changes", () => {
        const { testHost, session, channel } = createPreviewSession();
        playSong(testHost, buildSong(KEYBOARD_TARGET_CHANNEL));
        const songPreset = channel.preset;
        expect(songPreset?.name).not.toBe(PREVIEW);

        const [instrument] = session.document.instruments;
        session.setPreviewTarget({
            kind: "instrument",
            id: getObjectId(instrument)
        });
        const preset = session.document.presets[1];
        session.history.do([
            new EditPresetAction(preset, "name", preset.name, "Renamed")
        ]);

        expect(channel.preset?.name).not.toBe(PREVIEW);
    });

    it("brings the preview back when the play button pauses the song", () => {
        const { testHost, channel } = createPreviewSession();
        playSong(testHost, buildSong(KEYBOARD_TARGET_CHANNEL));

        testHost.client.send({ type: "toggle" });

        expect(testHost.host.sequencer.paused).toBe(true);
        expect(channel.preset?.name).toBe(PREVIEW);
    });

    it("gives the channel back to the song when it plays again", () => {
        const { testHost, channel } = createPreviewSession();
        playSong(testHost, buildSong(KEYBOARD_TARGET_CHANNEL));
        testHost.client.send({ type: "pause" });

        testHost.client.send({ type: "toggle" });

        expect(channel.preset?.name).not.toBe(PREVIEW);
    });

    it("keeps the song's controllers when another tab is shown", () => {
        const testHost = createTestHost();
        const first = createTestSession(testHost);
        const second = createTestSession(testHost);
        first.attach();
        playSong(testHost, buildSong(1));
        const channel = testHost.host.processor.midiChannels[1];
        expect(channel.midiControllers[7] >> 7).toBe(30);

        second.attach();
        render(testHost, 10);

        expect(channel.midiControllers[7] >> 7).toBe(30);
        expect(testHost.host.sequencer.paused).toBe(false);
    });

    it("plays the edited bank after an RMIDI is paused, and its own bank when it plays", () => {
        const { testHost, session } = createPreviewSession();
        const embedded = SoundBankLoader.fromArrayBuffer(
            BasicSoundBank.getSampleSoundBankFile()
        );
        embedded.presets[0].name = "EMBEDDED";
        const midi = new MIDIBuilder({ name: "song" });
        midi.noteOn(0, 0, 3, 60, 100);
        midi.noteOff(48_000, 0, 3, 60);
        midi.flush();
        const file = midi.writeRMIDI(embedded.writeSF2(), {
            soundBank: embedded
        });
        const { processor } = testHost.host;
        playSong(testHost, file);
        const editedBank = getMirror(session).bank;

        testHost.client.send({ type: "pause" });
        session.attach();
        processor.programChange(5, 0);
        const paused = getPresetBank(processor.midiChannels[5]);
        testHost.client.send({ type: "play" });
        processor.programChange(5, 0);

        expect(paused).toBe(editedBank);
        expect(processor.midiChannels[5].preset?.name).toBe("EMBEDDED");
    });
});

describe("the keyboard channel without a tab or presets", () => {
    it("plays the sample bank after the last tab closes", () => {
        const { testHost, session, channel } = createPreviewSession();
        expect(channel.preset?.name).toBe(PREVIEW);
        const closedBank = getMirror(session).bank;

        // What the app does when the last tab closes
        session.close();
        session.setPreviewTarget(undefined);
        testHost.client.send({ type: "pause" });

        const banks =
            testHost.host.processor.soundBankManager.soundBankList.map(
                (entry) => entry.soundBank
            );
        expect(channel.preset?.name).not.toBe(PREVIEW);
        expect(banks).toContain(getPresetBank(channel));
        expect(banks).not.toContain(closedBank);
    });

    it("keeps rendering when the shown bank has no presets left", () => {
        const { testHost, session } = createPreviewSession();
        playSong(testHost, buildSong(KEYBOARD_TARGET_CHANNEL));
        testHost.client.send({ type: "pause" });
        const [instrument] = session.document.instruments;
        session.setPreviewTarget({
            kind: "instrument",
            id: getObjectId(instrument)
        });
        testHost.host.processor.noteOn(KEYBOARD_TARGET_CHANNEL, 60, 100);
        render(testHost, 2);

        for (const preset of session.document.presets.slice()) {
            session.history.do([new DeletePresetAction(preset)]);
        }
        // The editor shows the overview next
        session.setPreviewTarget(undefined);

        expect(() => render(testHost, 10)).not.toThrow();
    });
});
