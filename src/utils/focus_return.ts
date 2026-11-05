/**
 * Whether the focus fell to the page, which happens when the focused element is removed.
 */
function isFocusLost() {
    const active = document.activeElement;
    return active === null || active === document.body;
}

/**
 * Remembers where the focus is, to give it back when a dialog, menu or toast question closes.
 * When that element is gone by then (the action removed it), the focus goes to its closest
 * focusable container that is still on the page, such as the element list.
 * @param element the element to return to, the focused one when not given
 * @returns gives the focus back. It checks again after the next paint, as the action that
 * removes the element may only render then.
 */
export function rememberFocus(
    element: Element | null = document.activeElement
) {
    const target =
        element instanceof HTMLElement && element !== document.body
            ? element
            : null;
    // Collected now, a removed element has no parents left
    const containers = new Array<HTMLElement>();
    for (
        let parent = target?.parentElement;
        parent;
        parent = parent.parentElement
    ) {
        if (parent.hasAttribute("tabindex")) {
            containers.push(parent);
        }
    }
    const focusClosest = () =>
        [target, ...containers].find((e) => e?.isConnected)?.focus();
    return () => {
        if (target?.isConnected) {
            target.focus();
        }
        requestAnimationFrame(() => {
            if (isFocusLost()) {
                focusClosest();
            }
        });
    };
}

/**
 * Moves the focus to the element `find` returns, after the next paint, if the focus fell to
 * the page meanwhile (a closed tab took its close button with it).
 * Only for keyboard users: with the focus on nothing, the list shortcuts keep working for
 * mouse users, which a focused tab button would stop.
 */
export function catchLostFocus(find: () => HTMLElement | null) {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.matches(":focus-visible")) {
        return;
    }
    requestAnimationFrame(() => {
        if (isFocusLost()) {
            find()?.focus();
        }
    });
}
