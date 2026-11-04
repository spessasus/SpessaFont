import { describe, expect, it } from "vitest";
import { BasicPreset, GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    ProcessorHost,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { ChangeSet } from "./change_set.ts";

function createAttachedSession() {
    const host = new ProcessorHost();
    const session = createTestSession(host);
    session.synth.attach();
    return { session, host, processor: host.processor };
}

describe("SynthBinding with the history", () => {
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
        session.synth.attach();

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
        const { session, host } = createAttachedSession();
        const [instrument] = session.document.instruments;
        const { refreshCount, clearCount } = host;

        session.history.do([
            new SetGeneratorAction(
                instrument,
                instrument.zones[0],
                GeneratorTypes.initialAttenuation,
                null,
                100
            )
        ]);

        expect(host.refreshCount).toBe(refreshCount);
        expect(host.clearCount).toBe(clearCount + 1);
    });

    it("does nothing for a commit that changed no view", () => {
        const { session, host } = createAttachedSession();
        const { refreshCount, clearCount } = host;
        const changes = new ChangeSet();
        changes.touch(session.document.presets[0]);

        session.store.commit(changes, session.store.getSnapshot().history);

        expect(host.refreshCount).toBe(refreshCount);
        expect(host.clearCount).toBe(clearCount);
    });

    it("leaves the preset list of a detached bank alone", () => {
        const host = new ProcessorHost();
        const session = createTestSession(host);
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

        expect(host.refreshCount).toBe(0);
        expect(host.clearCount).toBe(2);
    });

    it("stops telling the synthesizer about edits once the session is closed", () => {
        const { session, host } = createAttachedSession();
        session.close();
        const { refreshCount, clearCount } = host;

        publishSetUp(session);

        expect(host.refreshCount).toBe(refreshCount);
        expect(host.clearCount).toBe(clearCount);
    });
});
