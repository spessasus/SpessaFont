import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { DrawerSongControls } from "./drawer_song_controls.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";

export interface KeyReadout {
    midiNote: number;
    velocity: number;
}

interface DrawerHandleProps {
    /**
     * The shown element's name, or the overview's title.
     */
    name: string;
    /**
     * The key under a finger that is down, which replaces the name while it lasts.
     */
    readout: KeyReadout | undefined;
    /**
     * Landscape's octave strip, between the toggles and the name.
     */
    strip?: ReactNode;
}

function VoiceCount() {
    const { t } = useTranslation();
    const voiceCount = useEngineStatus((s) => s.voiceCount);
    return (
        <span className={"drawer_voices monospaced"}>
            {t("menuBarLocale.voices")} {voiceCount}
        </span>
    );
}

export function DrawerHandle({ name, readout, strip }: DrawerHandleProps) {
    const { t } = useTranslation();
    const {
        state: { drawer },
        dispatch
    } = usePhoneShell();
    const hasSong = useEngineStatus((s) => s.hasSong);

    return (
        <div className={"drawer_handle"}>
            <button
                type={"button"}
                className={"pretty_button drawer_toggle"}
                aria-pressed={drawer === "keys"}
                onClick={() =>
                    dispatch({
                        type: "setDrawer",
                        drawer: drawer === "keys" ? "collapsed" : "keys"
                    })
                }
            >
                {t("phoneLocale.drawer.keys")}
            </button>
            <button
                type={"button"}
                className={"pretty_button drawer_toggle"}
                aria-pressed={drawer === "controls"}
                onClick={() =>
                    dispatch({
                        type: "setDrawer",
                        drawer: drawer === "controls" ? "collapsed" : "controls"
                    })
                }
            >
                {t("phoneLocale.drawer.controls")}
            </button>
            {strip}
            <span
                className={"drawer_name"}
                hidden={hasSong && readout === undefined}
            >
                {readout ? (
                    <>
                        {t("keyboardLocale.midiKey")} {readout.midiNote}{" "}
                        {t("keyboardLocale.velocity")} {readout.velocity}
                    </>
                ) : (
                    name
                )}
            </span>
            {hasSong ? <DrawerSongControls /> : <VoiceCount />}
        </div>
    );
}
