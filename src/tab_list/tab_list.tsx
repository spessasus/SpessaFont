import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import "./tab_list.css";

export type TabListProps = {
    tabs: SoundBankManager[];
    closeTab: (t: number) => void;
    activeTab: number;
    setActiveTab: (t: number) => void;
};

export function TabList({
    tabs,
    activeTab,
    setActiveTab,
    closeTab
}: TabListProps) {
    const { t } = useTranslation();
    return (
        <div className="tab_list">
            {tabs.map((manager, i) => (
                <div
                    key={i}
                    className={`tab ${i === activeTab ? "active" : ""}`}
                    onClick={() => setActiveTab(i)}
                >
                    {`${manager.dirty ? "* " : ""}${manager.getBankName(t("bankInfo.unnamed"))}`}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            closeTab(i);
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
