import { useMIDIAccess } from "../midi_context/midi_context.ts";
import { Setting } from "../setting.tsx";
import { useTranslation } from "react-i18next";

export function MidiSettings() {
    const {
        devices,
        accessStatus,
        accessError,
        selectedDevice,
        setSelectedDevice
    } = useMIDIAccess();
    const { t } = useTranslation();

    if (accessStatus === "waiting")
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p>{t("settingsLocale.midi.waitingForAccess")}</p>
            </div>
        );

    if (accessStatus === "denied" || accessStatus === "unsupported")
        return (
            <div className="settings_group hover_brightness">
                <h2>{t("settingsLocale.midi.title")}</h2>
                <p className={"warning"}>
                    {accessStatus === "unsupported"
                        ? t("settingsLocale.midi.notSupported")
                        : (accessError ?? t("settingsLocale.midi.accessError"))}
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
