import "./tab_list.css";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export type TabListProps = {
    tabs: SoundBankManager[];
    closeTab: (t: number) => void;
    activeTab: number;
    setActiveTab: (t: number) => void;
    currentManager: SoundBankManager | undefined;
};

export function TabList({
    tabs,
    activeTab,
    setActiveTab,
    closeTab,
    currentManager
}: TabListProps) {
    const { t } = useTranslation();

    // this evil little code causes a re-render here, and only here. Doing change callback in-app re-renders the bank editor too
    const [v, setV] = useState(0);
    if (currentManager) {
        currentManager.changeCallback = () => setV(v + 1);
    }
    return (
        <div className="tab_list">
            {tabs.map((tab, i) => (
                <div
                    key={i}
                    className={`tab ${i === activeTab ? "active" : ""}`}
                    onClick={() => setActiveTab(i)}
                >
                    {tab.getTabName(t("bankInfo.unnamed"))}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (tab.dirty) {
                                if (window.confirm(t("unsavedChanges"))) {
                                    closeTab(i);
                                }
                            } else {
                                closeTab(i);
                            }
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
