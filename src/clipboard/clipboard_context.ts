import { createContext, useContext, useSyncExternalStore } from "react";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";

export const ClipboardContext = createContext<ClipboardManager | null>(null);

/**
 * Returns the shared clipboard and what it holds, and re-renders when something is copied.
 */
export function useClipboard() {
    const clipboard = useContext(ClipboardContext);
    if (!clipboard) throw new Error("Used without ClipboardProvider context!");
    const contents = useSyncExternalStore(
        clipboard.subscribe,
        clipboard.getSnapshot
    );
    return { clipboard, contents };
}
