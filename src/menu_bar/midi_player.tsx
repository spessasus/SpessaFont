import { useTranslation } from "react-i18next";
import { MenuBarDropdown } from "./menu_bar_dropdown.tsx";
import { MenuBarIcon } from "./menu_bar_icon.tsx";
import {
    MIDINameIcon,
    PauseIcon,
    PlayIcon,
    PlayMIDIIcon,
    TimeIcon
} from "../utils/icons/player_icons.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { formatTime } from "../utils/format_time.ts";
import { usePlayMIDIFile } from "./use_play_midi_file.ts";

const MAX_NAME_LENGTH = 10;

function TimeDisplay() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const time = useEngineStatus((s) => s.time);
    const duration = useEngineStatus((s) => s.duration);
    return (
        <MenuBarIcon
            title={t("menuBarLocale.midi.rewind")}
            onClick={() => audioEngine.rewindMIDI()}
            text={`${formatTime(time)} / ${formatTime(duration)}`}
        >
            <TimeIcon />
        </MenuBarIcon>
    );
}

function PauseButton() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const isPaused = useEngineStatus((s) => s.isPaused);
    return (
        <MenuBarIcon
            text={
                isPaused
                    ? t("menuBarLocale.midi.resume")
                    : t("menuBarLocale.midi.pause")
            }
            onClick={() => audioEngine.toggleMIDI()}
        >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
        </MenuBarIcon>
    );
}

export function MIDIPlayer() {
    const { t } = useTranslation();
    const hasSong = useEngineStatus((s) => s.hasSong);
    const songName = useEngineStatus((s) => s.songName);

    const handlePlayMIDI = usePlayMIDIFile();

    if (!hasSong) {
        return (
            <MenuBarDropdown main={t("menuBarLocale.midi.player")}>
                <MenuBarIcon
                    text={t("menuBarLocale.midi.play")}
                    onClick={() => void handlePlayMIDI()}
                >
                    <PlayMIDIIcon />
                </MenuBarIcon>
            </MenuBarDropdown>
        );
    }
    const name = songName ?? t("menuBarLocale.midi.noName");
    return (
        <MenuBarDropdown main={t("menuBarLocale.midi.player")}>
            <MenuBarIcon
                text={
                    name.length > MAX_NAME_LENGTH
                        ? name.slice(0, MAX_NAME_LENGTH) + "…"
                        : name
                }
                title={name}
                onClick={() => void handlePlayMIDI()}
            >
                <MIDINameIcon />
            </MenuBarIcon>
            <PauseButton />
            <TimeDisplay />
        </MenuBarDropdown>
    );
}
