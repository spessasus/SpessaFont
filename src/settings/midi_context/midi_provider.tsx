import * as React from "react";
import { useEffect, useState } from "react";
import { MIDIAccessContext, type MIDIAccessStatus } from "./midi_context";
import { logWarn, logError } from "../../utils/core_utils.ts";

export function MIDIProvider({ children }: { children?: React.ReactNode }) {
    const [devices, setDevices] = useState<MIDIInput[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<MIDIInput | null>(
        null
    );
    const [midiError, setMidiError] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] =
        useState<MIDIAccessStatus>("waiting");

    useEffect(() => {
        if (!("requestMIDIAccess" in navigator)) {
            logWarn("Your browser does not support WebMIDI.");
            setAccessStatus("denied");
            setMidiError("Your browser does not support WebMIDI.");
            return;
        }

        const requestAccess = async () => {
            try {
                const access = await navigator.requestMIDIAccess({
                    sysex: true,
                    software: true
                });
                setDevices(Array.from(access.inputs.values()));
                setAccessStatus("granted");
            } catch (error) {
                logError("Failed to get MIDI access.", error);
                setAccessStatus("denied");
                setMidiError((error as Error).message);
            }
        };
        void requestAccess();
    }, []);

    return (
        <MIDIAccessContext.Provider
            value={{
                accessStatus,
                accessError: midiError,
                devices,
                selectedDevice,
                setSelectedDevice
            }}
        >
            {children}
        </MIDIAccessContext.Provider>
    );
}
