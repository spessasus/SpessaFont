import "./tab_list.css";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";

export interface TabListProps {
    tabs: BankSession[];
    closeTab: (t: number) => void;
    activeTab: number;
    setActiveTab: (t: number) => void;
}

interface TabProps {
    session: BankSession;
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
}

function Tab({ session, isActive, onSelect, onClose }: TabProps) {
    const { t } = useTranslation();
    const { isDirty } = useHistoryState(session.store);
    const name = useBankSnapshot(session.store, (s) => s.info.name);
    const displayName = name.length > 0 ? name : t("bankInfo.unnamed");
    return (
        <div className={`tab ${isActive ? "active" : ""}`} onClick={onSelect}>
            {isDirty ? `* ${displayName}` : displayName}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                ×
            </button>
        </div>
    );
}

export function TabList({
    tabs,
    activeTab,
    setActiveTab,
    closeTab
}: TabListProps) {
    return (
        <div className="tab_list">
            {tabs.map((session, i) => (
                <Tab
                    key={session.id}
                    session={session}
                    isActive={i === activeTab}
                    onSelect={() => setActiveTab(i)}
                    onClose={() => closeTab(i)}
                />
            ))}
        </div>
    );
}
