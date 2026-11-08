import { BottomSheet } from "../phone_shell/bottom_sheet.tsx";
import type { ContextMenuEntry } from "./context_menu_context.ts";
import { ActionSheetItem } from "./action_sheet_item.tsx";
import "./action_sheet.css";

interface ActionSheetProps {
    title?: string;
    entries: readonly ContextMenuEntry[];
    onClose: () => void;
}

/**
 * The phone's context menu, a bottom sheet of 48 px items.
 */
export function ActionSheet({ title, entries, onClose }: ActionSheetProps) {
    return (
        <BottomSheet title={title} onClose={onClose}>
            <div
                role="menu"
                className="action_sheet"
                onContextMenu={(e) => e.preventDefault()}
            >
                {entries.map((entry, i) =>
                    entry === "separator" ? (
                        // Separators never move, so their position is a stable key
                        <hr
                            key={`separator-${i}`}
                            role="separator"
                            className="action_sheet_gap"
                        />
                    ) : (
                        <ActionSheetItem
                            key={entry.label}
                            item={entry}
                            onClose={onClose}
                        />
                    )
                )}
            </div>
        </BottomSheet>
    );
}
