import "./tab_list.css";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export interface TabListProps {
    tabs: SoundBankManager[];
    closeTab: (t: number) => void;
    activeTab: number;
    setActiveTab: (t: number) => void;
}

export function TabList({
    tabs,
    activeTab,
    setActiveTab,
    closeTab
}: TabListProps) {
    const { t } = useTranslation();

    // This evil little code causes a re-render here, and only here. Doing change callback in-app re-renders the bank editor too
    const [v, setV] = useState(0);
    return (
        <div className="tab_list">
            {tabs.map((tab, i) => {
                tab.changeCallback = () => setV(v + 1);
                return (
                    <div
                        key={i}
                        className={`tab ${i === activeTab ? "active" : ""}`}
                        onClick={() => setActiveTab(i)}
                    >
                        {tab.getTabName(t("bankInfo.unnamed"))}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTab(i);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
