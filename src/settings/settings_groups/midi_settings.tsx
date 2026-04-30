import { useMIDIAccess } from "../midi_context/midi_context.ts";
import { useEffect } from "react";
import { Setting } from "../setting.tsx";
import { useTranslation } from "react-i18next";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";

export function MidiSettings() {
    const {
        devices,
        accessStatus,
        accessError,
        selectedDevice,
        setSelectedDevice
    } = useMIDIAccess();
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();

    useEffect(() => {
        if (!selectedDevice) return;

        const handler = (e: MIDIMessageEvent) => {
            if (e.data) {
                audioEngine.processRealTime(e.data);
            }
        };

        selectedDevice.addEventListener("midimessage", handler);
        return () => {
            selectedDevice.removeEventListener("midimessage", handler);
        };
    }, [selectedDevice, audioEngine]);

    if (accessStatus === "waiting")
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p>{t("settingsLocale.midi.waitingForAccess")}</p>
            </div>
        );

    if (accessStatus === "denied")
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p className={"warning"}>
                    {accessError ?? "MIDI Access error."}
                </p>
            </div>
        );

    return (
        <div className="settings_group hover_brightness">
            <h2>{t("settingsLocale.midi.title")}</h2>
            <Setting locale={"settingsLocale.midi.midiInput"}>
                <select
                    className={"pretty_input monospaced"}
                    value={selectedDevice?.id ?? "NO_DEVICE"}
                    onChange={(e) =>
                        setSelectedDevice(
                            devices.find((d) => d.id === e.target.value) ?? null
                        )
                    }
                >
                    <option value="NO_DEVICE">
                        {t("settingsLocale.midi.noInput")}
                    </option>
                    {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
            </Setting>
        </div>
    );
}
