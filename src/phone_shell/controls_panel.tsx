import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./controls_panel.css";
import { OtherControllers } from "../keyboard/controller/other_controllers.tsx";
import { ControllerKnobs } from "../keyboard/controller/controller_knobs.tsx";
import { useSynthEvent } from "../hooks/use_synth_event.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import type { KeyReadout } from "./drawer_handle.tsx";

/**
 * The drawer's Controls state (spec 14.2): Panic and Reset, pitch wheel and pressure, the nine
 * controller slots of the desktop keyboard panel, and the last note played on the keyboard's
 * channel, as the keys are out of sight here.
 */
export function ControlsPanel() {
    const { t } = useTranslation();
    // A playing song owns the keyboard's channel, so the readout shows its notes too
    const isSongPlaying = useEngineStatus((s) => s.hasSong && !s.isPaused);
    const [lastNote, setLastNote] = useState<KeyReadout | undefined>(undefined);
    useSynthEvent((event) => {
        if (
            event.type === "noteOn" &&
            event.data.channel === KEYBOARD_TARGET_CHANNEL
        ) {
            setLastNote({
                midiNote: event.data.midiNote,
                velocity: event.data.velocity
            });
        }
    });
    return (
        <div className={"controls_panel"}>
            <div
                className={"controls_panel_readout"}
                role={"group"}
                aria-label={t("phoneLocale.drawer.lastNote")}
            >
                <span>{t("keyboardLocale.midiKey")}</span>
                <span className={"monospaced"}>
                    {lastNote?.midiNote ?? "-"}
                </span>
                <span>{t("keyboardLocale.velocity")}</span>
                <span className={"monospaced"}>
                    {lastNote?.velocity ?? "-"}
                </span>
            </div>
            {isSongPlaying ? (
                <p className={"controls_panel_song_note"}>
                    {t("phoneLocale.drawer.songOnChannel")}
                </p>
            ) : null}
            <div className={"controls_panel_ranges"}>
                <OtherControllers />
            </div>
            <div className={"controls_panel_knobs"}>
                <ControllerKnobs />
            </div>
        </div>
    );
}
