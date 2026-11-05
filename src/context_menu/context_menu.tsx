import "./context_menu.css";
import { type KeyboardEvent, useEffect, useRef } from "react";
import type { ContextMenuEntry } from "./context_menu_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";

interface ContextMenuProps {
    x: number;
    y: number;
    entries: readonly ContextMenuEntry[];
    onClose: () => void;
}

/**
 * Keeps the menu on screen (see the CSS), focuses the first item, and closes on a click
 * outside, Escape, scrolling, resizing, or leaving the window.
 */
export function ContextMenu({ x, y, entries, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const getItems = () =>
        Array.from(
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)"
            ) ?? []
        );

    useEffect(() => {
        menuRef.current
            ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
            ?.focus();
    }, []);

    const isOutside = (target: EventTarget | null) =>
        !(target instanceof Node && menuRef.current?.contains(target));
    useEventListener(document, "pointerdown", (e) => {
        if (isOutside(e.target)) {
            onClose();
        }
    });
    useEventListener(document, "wheel", (e) => {
        if (isOutside(e.target)) {
            onClose();
        }
    });
    useEventListener(globalThis, "resize", onClose);
    useEventListener(globalThis, "blur", onClose);

    const handleKeyDown = (e: KeyboardEvent) => {
        const items = getItems();
        const index = items.findIndex((i) => i === document.activeElement);
        let next: number | undefined;
        switch (e.key) {
            case "Escape":
            case "Tab": {
                e.preventDefault();
                onClose();
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

    return (
        <div
            ref={menuRef}
            role={"menu"}
            className={"context_menu"}
            style={{ "--menu-x": `${x}px`, "--menu-y": `${y}px` }}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
        >
            {entries.map((entry, i) =>
                entry === "separator" ? (
                    // Separators never move, so their position is a stable key
                    <hr key={`separator-${i}`} role={"separator"} />
                ) : (
                    <button
                        key={entry.label}
                        type={"button"}
                        role={"menuitem"}
                        className={"plain_button context_menu_item"}
                        disabled={entry.isDisabled}
                        onClick={() => {
                            onClose();
                            entry.onSelect();
                        }}
                    >
                        <span>{entry.label}</span>
                        {entry.shortcut ? (
                            <kbd className={"context_menu_shortcut"}>
                                {entry.shortcut}
                            </kbd>
                        ) : null}
                    </button>
                )
            )}
        </div>
    );
}
