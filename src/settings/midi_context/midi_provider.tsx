import * as React from "react";
import { useEffect, useState } from "react";
import { MIDIAccessContext, type MIDIAccessStatus } from "./midi_context";

export function MIDIProvider({ children }: { children?: React.ReactNode }) {
    const [devices, setDevices] = useState<MIDIInput[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<MIDIInput | null>(
        null
    );
    const [midiError, setMidiError] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] =
        useState<MIDIAccessStatus>("waiting");

    useEffect(() => {
        navigator
            .requestMIDIAccess({ sysex: true, software: true })
            .then((access) => {
                setDevices(Array.from(access.inputs.values()));
                setAccessStatus("granted");
            })
            .catch((error: unknown) => {
                console.error(error);
                setAccessStatus("denied");
                setMidiError((error as Error).message);
            });
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
