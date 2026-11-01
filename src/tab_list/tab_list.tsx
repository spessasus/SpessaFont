import "./tab_list.css";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";

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
    return (
        <div
            className={`tab ${isActive ? "active" : ""}`}
            role={"presentation"}
        >
            <button
                type={"button"}
                role={"tab"}
                aria-selected={isActive}
                className={"tab_select"}
                onClick={() => onSelect(session.id)}
            >
                {isDirty ? `* ${displayName}` : displayName}
            </button>
            <button
                type={"button"}
                className={"tab_close"}
                aria-label={t("closeTab", { name: displayName })}
                onClick={() => onClose(session)}
            >
                ×
            </button>
        </div>
    );
}

export function TabList({ tabs, activeId, onSelect, onClose }: TabListProps) {
    return (
        <div className="tab_list" role={"tablist"}>
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
