import { useTranslation } from "react-i18next";
import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators.css";
import { useState } from "react";
import { DefaultModulatorList } from "./default_modulators.tsx";
import type Manager from "../core_backend/manager.ts";

export function SoundBankInfo({
    manager,
    isLoading
}: {
    manager: Manager;
    isLoading: boolean;
}) {
    const { t } = useTranslation();
    const [defaultMods, setDefaultMods] = useState(false);

    if (isLoading) {
        return (
            <div className={"sound_bank_info_welcome"}>
                <h1>{t("synthInit.genericLoading")}</h1>
            </div>
        );
    }
    const bank = manager.bank;

    if (bank === undefined) {
        return (
            <div className={"sound_bank_info_welcome"}>
                <h1>{t("welcome.main")}</h1>
                <h2>{t("welcome.prompt")}</h2>
                <h3>{t("welcome.copyright")}</h3>
            </div>
        );
    }

    function toggleDefaultModulators() {
        setDefaultMods(!defaultMods);
    }

    if (defaultMods) {
        return (
            <div className={"sound_bank_info"}>
                <DefaultModulatorList manager={manager}></DefaultModulatorList>
                <BankInfoStats
                    bank={bank}
                    toggleDefaultModulators={toggleDefaultModulators}
                ></BankInfoStats>
            </div>
        );
    }

    return (
        <div className={"sound_bank_info"}>
            <EditableBankInfo manager={manager}></EditableBankInfo>
            <BankInfoStats
                bank={bank}
                toggleDefaultModulators={toggleDefaultModulators}
            ></BankInfoStats>
        </div>
    );
}
