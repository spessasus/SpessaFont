import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MIDIAccessContext, type MIDIAccessStatus } from "./midi_context.ts";
import { logError, logWarn } from "../../utils/core_utils.ts";

interface MIDIAccessState {
    status: MIDIAccessStatus;
    error: string | null;
    devices: MIDIInput[];
    midiAccess: MIDIAccess | null;
}

function getInitialAccessState(): MIDIAccessState {
    const isSupported = "requestMIDIAccess" in navigator;
    if (!isSupported) {
        logWarn("Your browser does not support WebMIDI.");
    }
    return {
        status: isSupported ? "waiting" : "unsupported",
        error: null,
        devices: [],
        midiAccess: null
    };
}

interface MIDIProviderProps {
    children?: ReactNode;
}

export function MIDIProvider({ children }: MIDIProviderProps) {
    const [access, setAccess] = useState(getInitialAccessState);
    const [selectedDevice, setSelectedDevice] = useState<MIDIInput | null>(
        null
    );
    const isWaiting = access.status === "waiting";

    useEffect(() => {
        if (!isWaiting) {
            return;
        }
        let isIgnored = false;
        const requestAccess = async () => {
            try {
                const midiAccess = await navigator.requestMIDIAccess({
                    sysex: true,
                    software: true
                });
                if (!isIgnored) {
                    setAccess({
                        status: "granted",
                        error: null,
                        devices: Array.from(midiAccess.inputs.values()),
                        midiAccess
                    });
                }
            } catch (error) {
                logError("Failed to get MIDI access.", error);
                if (!isIgnored) {
                    setAccess({
                        status: "denied",
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                        devices: [],
                        midiAccess: null
                    });
                }
            }
        };
        void requestAccess();
        return () => {
            isIgnored = true;
        };
    }, [isWaiting]);

    // Devices plugged in or out after access was granted
    const { midiAccess } = access;
    useEffect(() => {
        if (!midiAccess) {
            return;
        }
        const handleStateChange = () => {
            const devices = Array.from(midiAccess.inputs.values());
            setAccess((previous) => ({ ...previous, devices }));
            setSelectedDevice((selected) =>
                selected && devices.includes(selected) ? selected : null
            );
        };
        midiAccess.addEventListener("statechange", handleStateChange);
        return () =>
            midiAccess.removeEventListener("statechange", handleStateChange);
    }, [midiAccess]);

    const value = useMemo(
        () => ({
            accessStatus: access.status,
            accessError: access.error,
            devices: access.devices,
            selectedDevice,
            setSelectedDevice
        }),
        [access, selectedDevice]
    );

    return <MIDIAccessContext value={value}>{children}</MIDIAccessContext>;
}
