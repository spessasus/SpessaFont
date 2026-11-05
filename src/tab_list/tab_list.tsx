import "./tab_list.css";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import toast from "react-hot-toast";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { useDropTarget } from "../drag_and_drop/drag_context.ts";
import {
    isInstrument,
    isPreset,
    isSample
} from "../menu_list/menu_selection.ts";

export interface TabListProps {
    tabs: readonly BankSession[];
    activeId: number | undefined;
    onSelect: (id: number) => void;
    onClose: (session: BankSession) => void;
}

interface TabProps {
    session: BankSession;
    isActive: boolean;
    onSelect: (id: number) => void;
    onClose: (session: BankSession) => void;
}

function Tab({ session, isActive, onSelect, onClose }: TabProps) {
    const { t } = useTranslation();
    const { isDirty } = useHistoryState(session.store);
    const name = useBankSnapshot(session.store, (s) => s.info.name);
    const displayName = name.length > 0 ? name : t("bankInfo.unnamed");
    const { clipboard } = useClipboard();
    // Elements of another bank dropped on the tab are copied into this bank, like a paste
    const dropTarget = useDropTarget({
        accepts: (payload) => payload.session !== session,
        onDrop: ({ entities, session: source }) => {
            // An undo or a delete during the drag may have removed some
            const dropped = entities.filter((e) => source.document.contains(e));
            if (dropped.length === 0) {
                return;
            }
            const presets = dropped.filter(isPreset);
            // Counted before the copy, after it the copies take the patches
            const moved = clipboard.countMovedPresets(
                session.document,
                presets
            );
            session.history.do(
                clipboard.cloneElements(
                    session,
                    {
                        presets,
                        instruments: dropped.filter(isInstrument),
                        samples: dropped.filter(isSample)
                    },
                    source
                )
            );
            toast.success(
                t("clipboardLocale.copiedToBank", {
                    count: dropped.length,
                    name: displayName
                })
            );
            if (moved > 0) {
                toast(t("clipboardLocale.movedPresets", { count: moved }));
            }
        }
    });
    return (
        <div className={`tab ${isActive ? "active" : ""}`} {...dropTarget}>
            <button
                type={"button"}
                aria-current={isActive}
                className={"tab_select"}
                onClick={() => onSelect(session.id)}
            >
                {isDirty ? `* ${displayName}` : displayName}
            </button>
            <button
                type={"button"}
                className={"tab_close"}
                aria-label={t("closeTab", { name: displayName })}
                title={t("closeTab", { name: displayName })}
                onClick={() => onClose(session)}
            >
                ×
            </button>
        </div>
    );
}

/**
 * The open banks. A plain group of buttons, not the ARIA tabs pattern, as each bank also has a
 * close button, which a tab list cannot hold.
 */
export function TabList({ tabs, activeId, onSelect, onClose }: TabListProps) {
    const { t } = useTranslation();
    return (
        <div className="tab_list" role={"group"} aria-label={t("openBanks")}>
            {tabs.map((session) => (
                <Tab
                    key={session.id}
                    session={session}
                    isActive={session.id === activeId}
                    onSelect={onSelect}
                    onClose={onClose}
                />
            ))}
        </div>
    );
}
