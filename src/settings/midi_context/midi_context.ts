import { createContext, useContext } from "react";

export type MIDIAccessStatus = "waiting" | "granted" | "denied" | "unsupported";

export interface MIDIAccessContextType {
    accessStatus: MIDIAccessStatus;
    /**
     * The browser's message when access was denied.
     */
    accessError: string | null;
    devices: MIDIInput[];
    selectedDevice: MIDIInput | null;
    setSelectedDevice: (device: MIDIInput | null) => void;
}

export const MIDIAccessContext = createContext<MIDIAccessContextType | null>(
    null
);

export function useMIDIAccess() {
    const ctx = useContext(MIDIAccessContext);
    if (!ctx) throw new Error("Used without MIDIProvider context!");
    return ctx;
}
