import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import type { SoundBankInfoData } from "spessasynth_core";
import { SetBankInfoAction } from "./set_bank_info_action.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";

export function EditableBankInfo() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const info = useBankSnapshot(session.store, (s) => s.info);
    const bankName = info.name.length > 0 ? info.name : t("bankInfo.unnamed");

    useEffect(() => {
        document.title = `SpessaFont - ${bankName}`;
    }, [bankName]);

    function setInfo<K extends keyof SoundBankInfoData>(
        fourCC: K,
        value: SoundBankInfoData[K]
    ) {
        apply([new SetBankInfoAction(fourCC, info[fourCC], value)]);
    }

    const date = info.creationDate;

    return (
        <div className={"editable"}>
            <input
                className={"pretty_input hover_brightness"}
                id={"INAM"}
                onChange={(e) => setInfo("name", e.target.value)}
                value={info.name}
                placeholder={t("bankInfo.name")}
            />

            <div className={"fields"}>
                <span>
                    <label htmlFor={"IENG"}>{t("bankInfo.engineer")}</label>
                    <input
                        className={"pretty_input"}
                        id={"IENG"}
                        onChange={(e) => setInfo("engineer", e.target.value)}
                        value={info.engineer ?? ""}
                        placeholder={t("bankInfo.engineer")}
                    />
                </span>

                <span>
                    <label htmlFor={"ICRD"}>{t("bankInfo.creationDate")}</label>
                    <input
                        type={"datetime-local"}
                        className={"pretty_input hover_brightness"}
                        id={"ICRD"}
                        onChange={(e) =>
                            setInfo(
                                "creationDate",
                                e.target.valueAsDate ?? new Date()
                            )
                        }
                        value={date.toISOString().slice(0, 16)} // Format to 'YYYY-MM-DDTHH:MM' so input is happy
                        placeholder={t("bankInfo.creationDate")}
                    />
                </span>

                <span>
                    <label htmlFor={"IPRD"}>{t("bankInfo.product")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"IPRD"}
                        onChange={(e) => setInfo("product", e.target.value)}
                        value={info.product ?? ""}
                        placeholder={t("bankInfo.product")}
                    />
                </span>

                <span>
                    <label htmlFor={"ICOP"}>{t("bankInfo.copyright")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"ICOP"}
                        onChange={(e) => setInfo("copyright", e.target.value)}
                        value={info.copyright ?? ""}
                        placeholder={t("bankInfo.copyright")}
                    />
                </span>

                <span>
                    <label htmlFor={"ISBJ"}>{t("bankInfo.subject")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"ISBJ"}
                        onChange={(e) => setInfo("subject", e.target.value)}
                        value={info.subject ?? ""}
                        placeholder={t("bankInfo.subject")}
                    />
                </span>
            </div>
            <div className={"comment"}>
                <textarea
                    className={"pretty_input hover_brightness"}
                    id={"ICMT"}
                    onChange={(e) => setInfo("comment", e.target.value)}
                    value={info.comment ?? ""}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
