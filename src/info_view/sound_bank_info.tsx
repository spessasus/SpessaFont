import type { BasicSoundBank } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";

export function SoundBankInfo({
    bank,
    isLoading
}: {
    bank: BasicSoundBank | undefined;
    isLoading: boolean;
}) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className={"sound_bank_info_welcome"}>
                <h1>{t("synthInit.genericLoading")}</h1>
            </div>
        );
    }

    if (bank === undefined) {
        return (
            <div className={"sound_bank_info_welcome"}>
                <h1>{t("welcome.main")}</h1>
                <h2>{t("welcome.prompt")}</h2>
                <h3>{t("welcome.copyright")}</h3>
            </div>
        );
    }

    return (
        <div className={"sound_bank_info"}>
            <EditableBankInfo bank={bank}></EditableBankInfo>
            <BankInfoStats bank={bank}></BankInfoStats>
        </div>
    );
}
