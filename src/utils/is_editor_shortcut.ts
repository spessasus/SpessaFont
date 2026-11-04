/**
 * Whether a key press may run an editor shortcut (undo, save, delete, copy and paste).
 * Keys typed into a field belong to the field, and keys pressed inside a dialog or a toast
 * question belong to it. The shortcuts listen on the document, so they see all of these.
 */
export function isEditorShortcut(e: KeyboardEvent) {
    if (e.defaultPrevented) {
        return false;
    }
    const { target } = e;
    if (!(target instanceof HTMLElement)) {
        return true;
    }
    const isTyping =
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
    return !isTyping && target.closest("dialog, [role=alertdialog]") === null;
}
