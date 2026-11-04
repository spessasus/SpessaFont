import type { BankEntity } from "../core_backend/bank_view.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { useSelectionCommands } from "./use_selection_commands.ts";
import { isEditorShortcut } from "../utils/is_editor_shortcut.ts";

/**
 * Delete removes the selection (except what is still used), Ctrl+C copies the selection,
 * Ctrl+X cuts it, and Ctrl+V pastes what the clipboard holds.
 * Nothing runs while the editor is covered (by the settings), as its changes would be out of sight.
 */
export function useMenuShortcuts(
    selection: ReadonlySet<BankEntity>,
    isCovered: boolean
) {
    const commands = useSelectionCommands();
    useEventListener(document, "keydown", (e) => {
        if (isCovered || !isEditorShortcut(e)) {
            return;
        }
        if (e.key === "Delete") {
            commands.remove(selection);
        } else if (e.ctrlKey && e.key === "c") {
            commands.copy(selection);
        } else if (e.ctrlKey && e.key === "x") {
            commands.cut(selection);
        } else if (e.ctrlKey && e.key === "v") {
            commands.paste();
        }
    });
}
