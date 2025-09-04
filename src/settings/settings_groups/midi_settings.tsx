import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Setting } from "../setting.tsx";

const NO_DEVICE = "NO_DEVICE";

let midiAccessPersistent: MIDIAccess | null = null;
let selectedDevicePersistent: MIDIInput | null = null;
let midiDevices: MIDIInput[] = [];

export function MidiSettings({ engine }: { engine: AudioEngine }) {
    const { t } = useTranslation();
    const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(
        midiAccessPersistent
    );
    const [midiError, setMidiError] = useState<string | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<MIDIInput | null>(
        selectedDevicePersistent
    );

    useEffect(() => {
        if (midiAccess) {
            midiAccess.inputs.forEach((i) => {
                i.onmidimessage = null;
            });
        }
        if (selectedDevice !== null) {
            selectedDevice.onmidimessage = (e) => {
                if (e.data) {
                    engine.processor.processMessage(e.data);
                }
            };
        }
    }, [engine.processor, midiAccess, selectedDevice]);

    if (midiError) {
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p className={"warning"}>{midiError}</p>
            </div>
        );
    }

    if (!midiAccessPersistent) {
        const getMidiAccess = async () => {
            try {
                const access = await navigator.requestMIDIAccess({
                    sysex: true,
                    software: true
                });
                midiDevices = [];
                for (const input of access.inputs) {
                    midiDevices.push(input[1]);
                }
                midiAccessPersistent = access;
                setMidiAccess(access);
            } catch (error) {
                console.error("Failed to get MIDI access:", error);
                setMidiError(error?.toString() ?? "ERROR");
            }
        };

        void getMidiAccess();
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p>{t("settingsLocale.midi.waitingForAccess")}</p>
            </div>
        );
    }

    const setDevice = (id: string) => {
        const input = midiDevices.find((i) => i.id === id) ?? null;
        selectedDevicePersistent = input;
        setSelectedDevice(input);
    };

    return (
        <div className="settings_group hover_brightness">
            <h2>{t("settingsLocale.midi.title")}</h2>
            <Setting locale={"settingsLocale.midi.midiInput"}>
                <select
                    className={"pretty_input monospaced"}
                    value={selectedDevice?.id ?? NO_DEVICE}
                    onChange={(e) => setDevice(e.target.value)}
                >
                    <option value={NO_DEVICE}>
                        {t("settingsLocale.midi.noInput")}
                    </option>
                    {midiDevices.map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.name}
                        </option>
                    ))}
                </select>
            </Setting>
        </div>
    );
}
