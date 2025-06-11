import {
    type BasicPreset,
    messageTypes,
    midiControllers
} from "spessasynth_core";
import "./preset_editor.css";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";

function getGSDrums(chan: number, isDrums: boolean) {
    const chanAddress =
        0x10 |
        [1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 10, 11, 12, 13, 14, 15][chan % 17];
    const sysexData = [
        0x41, // Roland
        0x10, // Device ID (defaults to 16 on roland)
        0x42, // GS
        0x12, // Command ID (DT1) (whatever that means...)
        0x40, // System parameter           }
        chanAddress, // Channel parameter   } Address
        0x15, // Drum change                }
        isDrums ? 0x01 : 0x00 // Is Drums?  } Data
    ];
    // calculate checksum
    // https://cdn.roland.com/assets/media/pdf/F-20_MIDI_Imple_e01_W.pdf section 4
    const sum = 0x40 + chanAddress + 0x15 + 0x01;
    const checksum = 128 - (sum % 128);
    return [messageTypes.systemExclusive, ...sysexData, checksum, 0xf7];
}

export function PresetEditor({
    preset,
    engine
}: {
    preset: BasicPreset;
    engine: AudioEngine;
}) {
    setTimeout(() => {
        if (engine.processor.system !== "gs") {
            engine.processor.setSystem("gs");
        }
        engine.processor.midiAudioChannels[
            KEYBOARD_TARGET_CHANNEL
        ].stopAllNotes();
        // set bank
        if (preset.bank !== 128) {
            // disable drums
            engine.processor.processMessage(
                getGSDrums(KEYBOARD_TARGET_CHANNEL, false)
            );
            engine.processor.controllerChange(
                KEYBOARD_TARGET_CHANNEL,
                midiControllers.bankSelect,
                preset.bank
            );
        } else {
            engine.processor.controllerChange(
                KEYBOARD_TARGET_CHANNEL,
                midiControllers.bankSelect,
                0
            );
            // enable drums
            engine.processor.processMessage(
                getGSDrums(KEYBOARD_TARGET_CHANNEL, true)
            );
        }

        engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, preset.program);
    });
    return <div>Test! Editing preset: {preset.presetName}</div>;
}
