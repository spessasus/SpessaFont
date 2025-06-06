import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { ClipBoardManager } from "../core_backend/clipboard_manager.ts";
import { useTranslation } from "react-i18next";

export function SoundBankInfo({
    manager,
    clipboard
}: {
    manager: SoundBankManager;
    clipboard: ClipBoardManager;
}) {
    const { t } = useTranslation();
    const [defaultMods, setDefaultMods] = useState(false);
    const [name, setName] = useState(
        manager.getBankName(t("bankInfo.unnamed"))
    );

    function toggleDefaultModulators() {
        setDefaultMods(!defaultMods);
    }

    if (defaultMods) {
        return (
            <div className={"sound_bank_info"}>
                <DefaultModulatorList
                    manager={manager}
                    clipboard={clipboard}
                ></DefaultModulatorList>
                <BankInfoStats
                    manager={manager}
                    toggleDefaultModulators={toggleDefaultModulators}
                ></BankInfoStats>
            </div>
        );
    }

    return (
        <div className={"sound_bank_info"}>
            <EditableBankInfo
                name={name}
                setName={setName}
                manager={manager}
            ></EditableBankInfo>
            <BankInfoStats
                manager={manager}
                toggleDefaultModulators={toggleDefaultModulators}
            ></BankInfoStats>
        </div>
    );
}
