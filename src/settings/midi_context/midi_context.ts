import {
    createContext,
    type Dispatch,
    type SetStateAction,
    useContext
} from "react";

export type MIDIAccessStatus = "waiting" | "granted" | "denied";

export const MIDIAccessContext = createContext<{
    accessStatus: MIDIAccessStatus;
    accessError: string | null;
    devices: MIDIInput[];
    selectedDevice: MIDIInput | null;
    setSelectedDevice: Dispatch<SetStateAction<MIDIInput | null>>;
} | null>(null);

export const useMIDIAccess = () => {
    const ctx = useContext(MIDIAccessContext);
    if (!ctx) throw new Error("Used without MIDIProvider context!");
    return ctx;
};
