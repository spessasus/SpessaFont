/**
 * Input types that take typed text, with their own undo and cursor keys.
 */
const TEXT_INPUT_TYPES = new Set([
    "text",
    "search",
    "url",
    "tel",
    "email",
    "password",
    "number"
]);

/**
 * Marks the element list, the only place (besides nothing focused) where the list shortcuts
 * run. Spread it on the list's root element.
 */
export const ELEMENT_LIST_SCOPE = { "data-element-list": "" } as const;

/**
 * Whether the element takes typed text, so the keys that edit text belong to it.
 * Selects, sliders, checkboxes and buttons are not text fields: they have no undo of their own.
 */
export function isTextField(target: EventTarget | null) {
    return (
        target instanceof HTMLTextAreaElement ||
        // A read-only field (a generator cell that is not being edited) has no text to undo
        (target instanceof HTMLInputElement &&
            !target.readOnly &&
            TEXT_INPUT_TYPES.has(target.type)) ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

/**
 * Whether the element is in a dialog, a toast question or a menu, which take the keys they
 * are open for.
 */
export function isInModal(target: EventTarget | null) {
    return (
        target instanceof Element &&
        target.closest("dialog, [role=alertdialog], [role=menu]") !== null
    );
}

/**
 * Whether a key press may run a bank shortcut (undo, redo, back and forward).
 * Keys typed into a text field belong to the field, and keys pressed inside a dialog, a toast
 * question or a menu belong to it. The shortcuts listen on the document, so they see all of these.
 */
export function isEditorShortcut(e: KeyboardEvent) {
    return (
        !e.defaultPrevented && !isTextField(e.target) && !isInModal(e.target)
    );
}

/**
 * Whether a key press may run a list shortcut (delete, copy, cut, paste, duplicate, and the
 * arrow keys that show the next element). These act on the list's selection, so they only run
 * with the focus in the element list or on nothing. The editors handle the same keys themselves.
 */
export function isListShortcut(e: KeyboardEvent) {
    const { target } = e;
    const isOnNothing =
        !(target instanceof HTMLElement) ||
        target === document.body ||
        target === document.documentElement;
    return (
        isEditorShortcut(e) &&
        (isOnNothing ||
            (!(target instanceof HTMLSelectElement) &&
                target.closest("[data-element-list]") !== null))
    );
}
