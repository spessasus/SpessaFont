import type Manager from "../core_backend/manager.ts";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { MIDI, RMIDINFOChunks } from "spessasynth_core";

export function MIDIPlayer({ manager }: { manager: Manager }) {
    const { t } = useTranslation();
    const [midi, setMidi] = useState<MIDI>();

    useEffect(() => {
        if (midi !== undefined) {
            manager.playMIDI(midi);
        }
    }, [midi, manager]);

    if (manager.bank === undefined) {
        return <></>;
    }

    function playMIDI() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".mid,.midi,.rmi,.xmf,.mxmf,.smf";
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
        const [paused, setPaused] = useState(manager.sequencer.paused);
        if (paused) {
            return (
                <div
                    className={"menu_bar_item"}
                    onClick={() => {
                        manager.resumeMIDI();
                        setPaused(false);
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
                        manager.pauseMIDI();
                        setPaused(true);
                    }}
                >
                    {t("menuBarLocale.midi.pause")}
                </div>
            );
        }
    }

    function TimeDisplay() {
        const [currentTime, setCurrentTime] = useState(
            manager.sequencer.currentTime
        );

        useEffect(() => {
            const interval = setInterval(() => {
                setCurrentTime(manager.sequencer.currentTime);
            }, 800);

            return () => clearInterval(interval);
        }, []);

        const duration = manager.sequencer.midiData?.duration ?? 0;

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
