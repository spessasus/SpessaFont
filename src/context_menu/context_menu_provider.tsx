import { type ReactNode, useMemo, useState } from "react";
import {
    type ContextMenuAPI,
    ContextMenuContext,
    type ContextMenuEntry
} from "./context_menu_context.ts";
import { ContextMenu } from "./context_menu.tsx";

interface OpenMenu {
    x: number;
    y: number;
    entries: readonly ContextMenuEntry[];
    /**
     * Gets the focus back when the menu closes.
     */
    opener: HTMLElement | null;
}

interface ContextMenuProviderProps {
    children?: ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
    const [menu, setMenu] = useState<OpenMenu | null>(null);
    const api: ContextMenuAPI = useMemo(
        () => ({
            openMenu: (event, entries) => {
                event.preventDefault();
                event.stopPropagation();
                // A row passes the event of the button inside it, which is the one to refocus
                const target =
                    event.target instanceof HTMLElement
                        ? event.target.closest("button")
                        : null;
                const opener =
                    target ??
                    (event.currentTarget instanceof HTMLElement
                        ? event.currentTarget
                        : null);
                let x = event.clientX;
                let y = event.clientY;
                // The menu key fires at 0, 0, so open under the element instead
                if (x === 0 && y === 0 && opener) {
                    const rect = opener.getBoundingClientRect();
                    x = rect.left;
                    y = rect.bottom;
                }
                setMenu({ x, y, entries, opener });
            }
        }),
        []
    );

    const close = () => {
        if (menu?.opener?.isConnected) {
            menu.opener.focus();
        }
        setMenu(null);
    };

    return (
        <ContextMenuContext value={api}>
            {children}
            {menu ? (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    entries={menu.entries}
                    onClose={close}
                />
            ) : null}
        </ContextMenuContext>
    );
}
