import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Setting } from "../setting.tsx";

const NO_DEVICE = "NO_DEVICE";

let selectedDevicePersistent: MIDIInput | null = null;

export function MidiSettings({ engine }: { engine: AudioEngine }) {
    const { t } = useTranslation();
    const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
    const [midiError, setMidiError] = useState<string | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<MIDIInput | null>(
        selectedDevicePersistent
    );

    useEffect(() => {
        if (selectedDevice !== null) {
            selectedDevice.onmidimessage = (e) => {
                if (e.data) {
                    engine.processor.processMessage(e.data);
                }
            };
        }

        return () => {
            if (selectedDevice !== null) {
                selectedDevice.onmidimessage = null;
            }
        };
    }, [engine.processor, selectedDevice]);

    useEffect(() => {
        const getMidiAccess = async () => {
            try {
                const access = await navigator.requestMIDIAccess({
                    sysex: true,
                    software: true
                });
                setMidiAccess(access);
            } catch (error) {
                console.error("Failed to get MIDI access:", error);
                setMidiError(error?.toString() || "ERROR");
            }
        };

        getMidiAccess().then();
    }, [t]);

    if (midiError) {
        return (
            <div className="settings_group">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p style={{ color: "red" }}>{midiError}</p>
            </div>
        );
    }

    if (!midiAccess) {
        return (
            <div className="settings_group">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p>{t("settingsLocale.midi.waitingForAccess")}</p>
            </div>
        );
    }

    const inputMap: MIDIInput[] = [];
    for (const input of midiAccess.inputs) {
        inputMap.push(input[1]);
    }

    const setDevice = (id: string) => {
        const input = inputMap.find((i) => i.id === id) || null;
        selectedDevicePersistent = input;
        setSelectedDevice(input);
    };

    return (
        <div className="settings_group">
            <h2>{t("settingsLocale.midi.title")}</h2>
            <Setting locale={"settingsLocale.midi.midiInput"}>
                <select
                    className={"pretty_input"}
                    value={selectedDevice?.id || NO_DEVICE}
                    onChange={(e) => setDevice(e.target.value)}
                >
                    <option value={NO_DEVICE}>
                        {t("settingsLocale.midi.noInput")}
                    </option>
                    {inputMap.map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.name}
                        </option>
                    ))}
                </select>
            </Setting>
        </div>
    );
}
