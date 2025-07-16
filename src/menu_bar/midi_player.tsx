import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import {
    MIDI,
    RMIDINFOChunks,
    type SpessaSynthSequencer
} from "spessasynth_core";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import {
    MIDINameIcon,
    PauseIcon,
    PlayIcon,
    PlayMIDIIcon,
    TimeIcon
} from "../utils/icons.tsx";
import { typedMemo } from "../utils/typed_memo.ts";

const TimeDisplay = typedMemo(({ seq }: { seq: SpessaSynthSequencer }) => {
    const [currentTime, setCurrentTime] = useState(seq.currentTime);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(seq.currentTime);
        }, 800);

        return () => clearInterval(interval);
    }, [seq.currentTime]);

    const duration = seq.midiData?.duration ?? 0;

    function formatTime(seconds: number): string {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    return (
        <MenuBarIcon
            click={() => (seq.currentTime -= 0.1)}
            text={`${formatTime(currentTime)} / ${formatTime(duration)}`}
        >
            <TimeIcon />
        </MenuBarIcon>
    );
});

const PauseComponent = typedMemo(
    ({ audioEngine }: { audioEngine: AudioEngine }) => {
        // doing not here fixes things??
        const [paused, setPaused] = useState(!audioEngine.MIDIPaused);
        const { t } = useTranslation();
        if (paused) {
            return (
                <MenuBarIcon
                    text={t("menuBarLocale.midi.resume")}
                    click={() => {
                        audioEngine.toggleMIDI();
                        setPaused(audioEngine.MIDIPaused);
                    }}
                >
                    <PlayIcon />
                </MenuBarIcon>
            );
        } else {
            return (
                <MenuBarIcon
                    text={t("menuBarLocale.midi.pause")}
                    click={() => {
                        audioEngine.toggleMIDI();
                        setPaused(audioEngine.MIDIPaused);
                    }}
                >
                    <PauseIcon />
                </MenuBarIcon>
            );
        }
    }
);

export function MIDIPlayer({ audioEngine }: { audioEngine: AudioEngine }) {
    const { t } = useTranslation();
    const [midi, setMidi] = useState<MIDI>();

    useEffect(() => {
        if (midi !== undefined) {
            audioEngine.playMIDI(midi);
        }
    }, [midi, audioEngine]);

    const playMIDI = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".mid,.midi,.rmi,.xmf,.mxmf,.smf,.kar";
        input.onchange = async () => {
            if (input.files?.[0] === undefined) {
                return;
            }
            const file = input.files[0];
            const buf = await file.arrayBuffer();
            const mid = new MIDI(buf, file.name);
            setMidi(mid);
        };
        input.click();
    }, []);

    if (midi === undefined) {
        return (
            <MenuBarDropdown main={t("menuBarLocale.midi.player")}>
                <MenuBarIcon
                    text={t("menuBarLocale.midi.play")}
                    click={playMIDI}
                >
                    <PlayMIDIIcon />
                </MenuBarIcon>
            </MenuBarDropdown>
        );
    } else {
        let name: string;
        if (midi.RMIDInfo[RMIDINFOChunks.name] !== undefined) {
            name = midi.midiName;
        } else {
            name = new TextDecoder("Shift_JIS").decode(midi.rawMidiName);
        }
        name = name || midi.fileName;
        name = name.length > 10 ? name.substring(0, 10) + "..." : name;
        return (
            <MenuBarDropdown main={t("menuBarLocale.midi.player")}>
                <MenuBarIcon text={name} click={playMIDI}>
                    <MIDINameIcon />
                </MenuBarIcon>
                <PauseComponent audioEngine={audioEngine} />
                <TimeDisplay seq={audioEngine.sequencer} />
            </MenuBarDropdown>
        );
    }
}
