import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { MIDI, RMIDINFOChunks } from "spessasynth_core";
import type { AudioEngine } from "../core_backend/audio_engine.ts";

export function MIDIPlayer({ audioEngine }: { audioEngine: AudioEngine }) {
    const { t } = useTranslation();
    const [midi, setMidi] = useState<MIDI>();

    useEffect(() => {
        if (midi !== undefined) {
            audioEngine.playMIDI(midi);
        }
    }, [midi, audioEngine]);

    function playMIDI() {
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
    }

    function PauseComponent() {
        const [paused, setPaused] = useState(audioEngine.MIDIPaused);
        if (paused) {
            return (
                <div
                    className={"menu_bar_item"}
                    onClick={() => {
                        audioEngine.toggleMIDI();
                        setPaused(audioEngine.MIDIPaused);
                    }}
                >
                    {t("menuBarLocale.midi.resume")}
                </div>
            );
        } else {
            return (
                <div
                    className={"menu_bar_item"}
                    onClick={() => {
                        audioEngine.toggleMIDI();
                        setPaused(audioEngine.MIDIPaused);
                    }}
                >
                    {t("menuBarLocale.midi.pause")}
                </div>
            );
        }
    }

    function TimeDisplay() {
        const [currentTime, setCurrentTime] = useState(
            audioEngine.sequencer.currentTime
        );

        useEffect(() => {
            const interval = setInterval(() => {
                setCurrentTime(audioEngine.sequencer.currentTime);
            }, 800);

            return () => clearInterval(interval);
        }, []);

        const duration = audioEngine.sequencer.midiData?.duration ?? 0;

        function formatTime(seconds: number): string {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec.toString().padStart(2, "0")}`;
        }

        return (
            <div className="midi_time_display menu_bar_item">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
        );
    }

    if (midi === undefined) {
        return (
            <div className={"menu_bar"}>
                <div className={"menu_bar_button"}>
                    {t("menuBarLocale.midi.player")}
                </div>
                <div className={"menu_bar_contents"}>
                    <div className={"menu_bar_item"} onClick={playMIDI}>
                        {t("menuBarLocale.midi.play")}
                    </div>
                </div>
            </div>
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
            <div className={"menu_bar"}>
                <div className={"menu_bar_button"}>
                    {t("menuBarLocale.midi.player")}
                </div>
                <div className={"menu_bar_contents"}>
                    <div onClick={playMIDI} className={"menu_bar_item"}>
                        <i>{name}</i>
                    </div>
                    <PauseComponent />
                    <TimeDisplay />
                </div>
            </div>
        );
    }
}
