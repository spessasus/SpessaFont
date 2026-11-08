import { useTranslation } from "react-i18next";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { PauseIcon, PlayIcon } from "../utils/icons/player_icons.tsx";
import { formatTime } from "../utils/format_time.ts";

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
    const toggleLabel = isPaused
        ? t("phoneLocale.drawer.resume")
        : t("phoneLocale.drawer.pause");
    return (
        <div className={"drawer_song_controls"}>
            <span aria-hidden={true}>♪</span>
            <span className={"drawer_song_name"} title={name}>
                {name}
            </span>
            <span className={"drawer_song_time monospaced"}>
                {formatTime(time)} / {formatTime(duration)}
            </span>
            <button
                type={"button"}
                className={"pretty_button drawer_song_toggle"}
                aria-label={toggleLabel}
                title={toggleLabel}
                onClick={() => audioEngine.toggleMIDI()}
            >
                {isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
        </div>
    );
}
