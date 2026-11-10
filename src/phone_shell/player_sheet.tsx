import { useTranslation } from "react-i18next";
import "./player_sheet.css";
import { BottomSheet } from "./bottom_sheet.tsx";
import { ActionSheetItem } from "../context_menu/action_sheet_item.tsx";
import "../context_menu/action_sheet.css";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { usePlayMIDIFile } from "../menu_bar/use_play_midi_file.ts";
import { formatTime } from "../utils/format_time.ts";
import {
    PauseIcon,
    PlayIcon,
    PlayMIDIIcon,
    TimeIcon
} from "../utils/icons/player_icons.tsx";

interface PlayerSheetProps {
    onClose: () => void;
}

/**
 * The song's controls on a phone (spec 12.6), opened from the song name in the drawer: the
 * whole name, the time, pause or resume, rewind and another file.
 */
export function PlayerSheet({ onClose }: PlayerSheetProps) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const playMIDIFile = usePlayMIDIFile();
    const songName = useEngineStatus((s) => s.songName);
    const time = useEngineStatus((s) => s.time);
    const duration = useEngineStatus((s) => s.duration);
    const isPaused = useEngineStatus((s) => s.isPaused);
    return (
        <BottomSheet
            title={songName ?? t("menuBarLocale.midi.noName")}
            onClose={onClose}
        >
            <p className={"player_sheet_time monospaced"}>
                {formatTime(time)} / {formatTime(duration)}
            </p>
            <div role={"menu"} className={"action_sheet player_sheet"}>
                <ActionSheetItem
                    hasIconSlot={true}
                    item={{
                        label: isPaused
                            ? t("phoneLocale.drawer.resume")
                            : t("phoneLocale.drawer.pause"),
                        iconNode: isPaused ? <PlayIcon /> : <PauseIcon />,
                        onSelect: () => audioEngine.toggleMIDI()
                    }}
                />
                <ActionSheetItem
                    hasIconSlot={true}
                    item={{
                        // The desktop player's jump back, under its name
                        label: t("menuBarLocale.midi.rewind"),
                        iconNode: <TimeIcon />,
                        onSelect: () => audioEngine.rewindMIDI()
                    }}
                />
                <ActionSheetItem
                    hasIconSlot={true}
                    // Closes first, the file picker comes after
                    onClose={onClose}
                    item={{
                        label: t("phoneLocale.drawer.openAnotherMIDI"),
                        iconNode: <PlayMIDIIcon />,
                        onSelect: () => void playMIDIFile()
                    }}
                />
            </div>
        </BottomSheet>
    );
}
