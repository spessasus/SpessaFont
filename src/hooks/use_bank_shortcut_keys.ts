import type { SaveFormat } from "../core_backend/persistence.ts";
import { isEditorShortcut, isTextField } from "../utils/is_editor_shortcut.ts";
import { useEventListener } from "./use_event_listener.ts";

interface BankShortcutCommands {
    undo: () => void;
    redo: () => void;
    save: (format: SaveFormat) => void;
}

/**
 * Runs undo, redo and save from the keyboard (Ctrl or Cmd with Z, Shift+Z, Y and S).
 * Shared by the desktop menu bar and the phone shell, as a phone can have a keyboard too.
 * @param hasSession whether a bank is open
 * @param commands the commands of the active bank, from useBankCommands
 * @param isEditorCovered whether the settings cover the editor, which turns undo and redo off
 */
export function useBankShortcutKeys(
    hasSession: boolean,
    commands: BankShortcutCommands,
    isEditorCovered: boolean
) {
    const { undo, redo, save } = commands;

    useEventListener(document, "keydown", (e) => {
        if (e.defaultPrevented || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        // Shift or Caps Lock gives upper case letters, and Ctrl+Shift+Z is redo too
        const key = e.key.toLowerCase();
        // Ctrl+S saves the bank from anywhere, the browser would save the web page instead.
        // Only a dialog or a toast question keeps it: the save's own questions could not be
        // answered behind a dialog, and a toast may be the save asking something already
        if (key === "s") {
            e.preventDefault();
            // Holding the keys would start a save for every repeat
            if (
                !hasSession ||
                e.repeat ||
                (e.target instanceof Element &&
                    e.target.closest("dialog, [role=alertdialog]") !== null)
            ) {
                return;
            }
            // The field applies its draft when it loses the focus, so the save includes it
            if (isTextField(e.target) && e.target instanceof HTMLElement) {
                e.target.blur();
                e.target.focus();
            }
            save("auto");
            return;
        }
        if (isEditorCovered || !hasSession || !isEditorShortcut(e)) {
            return;
        }
        switch (key) {
            case "z": {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            }
            case "y": {
                e.preventDefault();
                redo();
                break;
            }
        }
    });
}
