import {
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    useId,
    useRef,
    useState
} from "react";

interface MenuBarDropdownProps {
    main: string;
    children?: ReactNode;
}

/**
 * A menu bar menu. It shows on hover, and opens on a click, Enter or the down arrow.
 * The arrow keys move between its items. Escape, Tab, a click outside and running an item
 * close it.
 */
export function MenuBarDropdown({ main, children }: MenuBarDropdownProps) {
    // Hovering shows a closed menu too, unless it was just used ("used" hides it until the
    // pointer leaves, so a clicked item does not leave it open)
    const [state, setState] = useState<"open" | "closed" | "used">("closed");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentsRef = useRef<HTMLDivElement>(null);
    const contentsId = useId();
    const isOpen = state === "open";

    const getItems = () =>
        Array.from(
            contentsRef.current?.querySelectorAll<HTMLButtonElement>(
                "[role=menuitem]:not(:disabled)"
            ) ?? []
        );

    const openAndFocus = (isLast: boolean) => {
        setState("open");
        // The items cannot take the focus until the menu renders open
        requestAnimationFrame(() => {
            const items = getItems();
            items[isLast ? items.length - 1 : 0]?.focus();
        });
    };

    // Under the pointer, a closed menu would still show by hover
    const close = () =>
        setState(wrapperRef.current?.matches(":hover") ? "used" : "closed");

    const handleTriggerKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAndFocus(e.key === "ArrowUp");
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    };

    const handleContentsKeyDown = (e: KeyboardEvent) => {
        const items = getItems();
        const index = items.findIndex((i) => i === document.activeElement);
        let next: number | undefined;
        switch (e.key) {
            case "Escape": {
                e.preventDefault();
                close();
                triggerRef.current?.focus();
                return;
            }
            case "Tab": {
                // The focus moves on by itself, past the hidden items
                setState("closed");
                return;
            }
            case "ArrowDown": {
                next = (index + 1) % items.length;
                break;
            }
            case "ArrowUp": {
                next = (index - 1 + items.length) % items.length;
                break;
            }
            case "Home": {
                next = 0;
                break;
            }
            case "End": {
                next = items.length - 1;
                break;
            }
            default: {
                return;
            }
        }
        e.preventDefault();
        items[next]?.focus();
    };

    // Running an item closes the menu. The item's own handler ran first
    const handleContentsClick = (e: MouseEvent) => {
        if (
            !(e.target instanceof Element) ||
            e.target.closest("[role=menuitem]") === null
        ) {
            return;
        }
        close();
        // A click from the keyboard (detail 0) goes back to the menu, a mouse click lets go
        // of the focus, so the list shortcuts work as before the menu was used
        if (e.detail === 0) {
            triggerRef.current?.focus();
        } else if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    const handleBlur = (e: FocusEvent) => {
        if (!(
            e.relatedTarget instanceof Node &&
            e.currentTarget.contains(e.relatedTarget)
        )) {
            // Keeps "used", a clicked item lets go of the focus after closing the menu
            setState((current) => (current === "open" ? "closed" : current));
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={"menu_bar"}
            data-state={state}
            onBlur={handleBlur}
            onPointerLeave={() => {
                if (state === "used") setState("closed");
            }}
        >
            <button
                ref={triggerRef}
                type={"button"}
                className={"menu_bar_button"}
                aria-haspopup={"menu"}
                aria-expanded={isOpen}
                aria-controls={contentsId}
                onClick={(e) => {
                    if (isOpen) {
                        close();
                    } else if (e.detail === 0) {
                        // Enter or Space, the keyboard goes on into the menu
                        openAndFocus(false);
                    } else {
                        setState("open");
                    }
                }}
                onKeyDown={handleTriggerKeyDown}
            >
                {main}
            </button>
            <div
                ref={contentsRef}
                id={contentsId}
                role={"menu"}
                aria-label={main}
                className={"menu_bar_contents"}
                onKeyDown={handleContentsKeyDown}
                onClick={handleContentsClick}
            >
                {children}
            </div>
        </div>
    );
}
