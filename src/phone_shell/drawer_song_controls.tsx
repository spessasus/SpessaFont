import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import {
    MIDINameIcon,
    PauseIcon,
    PlayIcon
} from "../utils/icons/player_icons.tsx";
import { formatTime } from "../utils/format_time.ts";
import { PlayerSheet } from "./player_sheet.tsx";

/**
 * The loaded song in the drawer's handle, built on the logic of the desktop MIDI player.
 */
export function DrawerSongControls() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const songName = useEngineStatus((s) => s.songName);
    const time = useEngineStatus((s) => s.time);
    const duration = useEngineStatus((s) => s.duration);
    const isPaused = useEngineStatus((s) => s.isPaused);
    const name = songName ?? t("menuBarLocale.midi.noName");
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const toggleLabel = isPaused
        ? t("phoneLocale.drawer.resume")
        : t("phoneLocale.drawer.pause");
    return (
        <div className={"drawer_song_controls"}>
            {/* The whole song row opens its sheet, the toggle stays a quick pause */}
            <button
                type={"button"}
                className={"plain_button drawer_song_open"}
                aria-label={`${t("phoneLocale.drawer.songDetails")}: ${name}`}
                onClick={() => setIsSheetOpen(true)}
            >
                <span className={"drawer_song_icon"} aria-hidden={true}>
                    <MIDINameIcon />
                </span>
                <span className={"drawer_song_name"}>{name}</span>
                <span className={"drawer_song_time monospaced"}>
                    {formatTime(time)} / {formatTime(duration)}
                </span>
            </button>
            <button
                type={"button"}
                className={"plain_button drawer_song_toggle"}
                aria-label={toggleLabel}
                title={toggleLabel}
                onClick={() => audioEngine.toggleMIDI()}
            >
                {isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
            {isSheetOpen ? (
                <PlayerSheet onClose={() => setIsSheetOpen(false)} />
            ) : null}
        </div>
    );
}
