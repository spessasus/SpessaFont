import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { type JSX, useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import type { ClipBoardManager } from "../../core_backend/clipboard_manager.ts";
import { useTranslation } from "react-i18next";

export function SoundBankInfo({
    manager,
    clipboard,
    ccOptions,
    destinationOptions
}: {
    manager: SoundBankManager;
    clipboard: ClipBoardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
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
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
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
