import { useTranslation } from "react-i18next";
import { BasicMIDI } from "spessasynth_core";
import toast from "react-hot-toast";
import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import {
    MIDINameIcon,
    PauseIcon,
    PlayIcon,
    PlayMIDIIcon,
    TimeIcon
} from "../utils/icons/player_icons.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { ACCEPTED_MIDI_FORMATS } from "../utils/accepted_formats.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { pickFile } from "../utils/pick_file.ts";
import { logError } from "../utils/core_utils.ts";

const MAX_NAME_LENGTH = 10;

function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

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
    const { audioEngine } = useAudioEngine();
    const hasSong = useEngineStatus((s) => s.hasSong);
    const songName = useEngineStatus((s) => s.songName);

    const handlePlayMIDI = async () => {
        const file = await pickFile(ACCEPTED_MIDI_FORMATS);
        if (!file) {
            return;
        }
        try {
            const mid = BasicMIDI.fromArrayBuffer(
                await file.arrayBuffer(),
                file.name
            );
            audioEngine.playMIDI(mid);
        } catch (error) {
            logError(`Failed to load ${file.name}.`, error);
            toast.error(t("menuBarLocale.midi.loadError", { name: file.name }));
        }
    };

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
                        ? name.slice(0, MAX_NAME_LENGTH) + "..."
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
