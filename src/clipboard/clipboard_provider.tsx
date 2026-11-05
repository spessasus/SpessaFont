import type { ReactNode } from "react";
import { useState } from "react";
import { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { ClipboardContext } from "./clipboard_context.ts";

interface ClipboardProviderProps {
    children?: ReactNode;
}

export function ClipboardProvider({ children }: ClipboardProviderProps) {
    const [clipboard] = useState(() => new ClipboardManager());
    return <ClipboardContext value={clipboard}>{children}</ClipboardContext>;
}
