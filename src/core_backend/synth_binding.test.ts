import { describe, expect, it } from "vitest";
import { BasicPreset, SpessaSynthProcessor } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";

function createAttachedSession() {
    const processor = new SpessaSynthProcessor(44_100);
    const session = createTestSession(processor);
    session.synth.attach();
    return { session, processor };
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
});
