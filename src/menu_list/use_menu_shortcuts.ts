import type { BankEntity } from "../core_backend/bank_view.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { useSelectionCommands } from "./use_selection_commands.ts";

/**
 * Keys typed into a field belong to the field, not to the element list.
 */
function isTypingTarget(target: EventTarget | null) {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement)
    );
}

/**
 * Delete removes the selection (except what is still used), Ctrl+C copies the selection,
 * Ctrl+X cuts it, and Ctrl+V pastes what the clipboard holds.
 */
export function useMenuShortcuts(selection: ReadonlySet<BankEntity>) {
    const commands = useSelectionCommands();
    useEventListener(document, "keydown", (e) => {
        if (isTypingTarget(e.target)) {
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
