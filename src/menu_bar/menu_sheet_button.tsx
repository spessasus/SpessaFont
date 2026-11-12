import { type MouseEvent, type ReactNode, useState } from "react";
import "../context_menu/action_sheet.css";
import { BottomSheet } from "../phone_shell/bottom_sheet.tsx";
import { WrenchIcon } from "../utils/icons/edit_icons.tsx";
import "./menu_bar_phone.css";
import { Presence } from "../presence/presence.tsx";

interface MenuSheetButtonProps {
    main: string;
    children?: ReactNode;
}

/**
 * The phone form of a menu bar menu, a wrench button that opens the items as a bottom sheet.
 */
export function MenuSheetButton({ main, children }: MenuSheetButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    // The items close the sheet here, so each one only needs its own handler
    const handleClick = (e: MouseEvent) => {
        if (
            e.target instanceof Element &&
            e.target.closest("[role=menuitem]") !== null
        ) {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className="menu_sheet_button"
                aria-label={main}
                aria-haspopup="dialog"
                onClick={() => setIsOpen(true)}
            >
                <WrenchIcon />
            </button>
            <Presence>
                {isOpen ? (
                    <BottomSheet title={main} onClose={() => setIsOpen(false)}>
                        <div
                            role="menu"
                            aria-label={main}
                            className="action_sheet"
                            onClick={handleClick}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {children}
                        </div>
                    </BottomSheet>
                ) : null}
            </Presence>
        </>
    );
}
