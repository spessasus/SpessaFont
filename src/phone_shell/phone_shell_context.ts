import { createContext, useContext } from "react";
import type { Dispatch } from "react";
import type { PhoneShellAction, PhoneShellState } from "./phone_shell_state.ts";

export interface PhoneShellContextValue {
    state: PhoneShellState;
    dispatch: Dispatch<PhoneShellAction>;
}

export const PhoneShellContext = createContext<PhoneShellContextValue | null>(
    null
);

export function usePhoneShell() {
    const value = useContext(PhoneShellContext);
    if (value === null) {
        throw new Error("Used without PhoneShell!");
    }
    return value;
}
