import type { BankEntity } from "../core_backend/bank_view.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { useSelectionCommands } from "./use_selection_commands.ts";
import { isListShortcut } from "../utils/is_editor_shortcut.ts";
import { isDeleteKey } from "../utils/shortcut_text.ts";

/**
 * Delete removes the selection (except what is still used), Ctrl+C copies the selection,
 * Ctrl+X cuts it, Ctrl+D duplicates it, and Ctrl+V pastes what the clipboard holds (Cmd on macOS).
 * They only run with the focus in the element list or on nothing, the editors have their own.
 * Nothing runs while the editor is covered (by the settings), as its changes would be out of sight.
 */
export function useMenuShortcuts(
    selection: ReadonlySet<BankEntity>,
    isCovered: boolean
) {
    const commands = useSelectionCommands();
    useEventListener(document, "keydown", (e) => {
        if (isCovered || !isListShortcut(e)) {
            return;
        }
        // A held key would delete or paste once per repeat, each time on what the last one showed
        if (isDeleteKey(e)) {
            e.preventDefault();
            if (!e.repeat) commands.remove(selection);
            return;
        }
        // Cmd on macOS, and Caps Lock gives upper case letters
        if (!(e.ctrlKey || e.metaKey)) {
            return;
        }
        switch (e.key.toLowerCase()) {
            case "c": {
                if (!e.repeat) commands.copy(selection);
                break;
            }

            case "x": {
                if (!e.repeat) commands.cut(selection);
                break;
            }

            case "d": {
                // The browser would bookmark the page
                e.preventDefault();
                if (!e.repeat) commands.duplicate(selection);
                break;
            }

            case "v": {
                if (!e.repeat) commands.paste();
            }
        }
    });
}
