import type { SoundBankInfoData } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { HistoryAction } from "../core_backend/history.ts";

class SetBankInfo<K extends keyof SoundBankInfoData> implements HistoryAction {
    callback: (s: NonNullable<SoundBankInfoData[K]>) => void;
    private readonly oldVal: NonNullable<SoundBankInfoData[K]>;
    private readonly newVal: NonNullable<SoundBankInfoData[K]>;
    private readonly fourCC: K;

    constructor(
        callback: (s: NonNullable<SoundBankInfoData[K]>) => void,
        oldVal: NonNullable<SoundBankInfoData[K]>,
        newVal: NonNullable<SoundBankInfoData[K]>,
        fourCC: K
    ) {
        this.callback = callback;
        this.oldVal = oldVal;
        this.newVal = newVal;
        this.fourCC = fourCC;
    }

    do(b: SoundBankManager) {
        b.soundBankInfo[this.fourCC] = this.newVal;
        this.callback(this.newVal);
    }

    undo(b: SoundBankManager) {
        b.soundBankInfo[this.fourCC] = this.oldVal;
        this.callback(this.oldVal);
    }
}

export function EditableBankInfo({
    manager,
    name,
    setName
}: {
    manager: SoundBankManager;
    name: string;
    setName: (n: string) => void;
}) {
    const { t } = useTranslation();

    const [date, setDate] = useState(new Date());
    const [engineer, setEngineer] = useState("");
    const [prod, setProd] = useState("");
    const [copy, setCopy] = useState("");
    const [subject, setSubject] = useState("");
    const [cmt, setCmt] = useState("");
    useEffect(() => {
        document.title = `SpessaFont - ${manager.getBankName(t("bankInfo.unnamed"))}`;
    }, [manager, t, name]);

    const bank = manager;

    useEffect(() => {
        if (bank !== undefined) {
            setName(manager.getInfo("name"));
            setDate(manager.getInfo("creationDate"));
            setEngineer(manager.getInfo("engineer") ?? "");
            setProd(manager.getInfo("product") ?? "");
            setCopy(manager.getInfo("copyright") ?? "");
            setSubject(manager.getInfo("subject") ?? "");
            setCmt(manager.getInfo("comment") ?? "");
        }
    }, [bank, manager, setName]);

    return (
        <div className={"editable"}>
            <input
                className={"pretty_input hover_brightness"}
                id={"INAM"}
                onChange={(e) => {
                    manager.modifyBank([
                        new SetBankInfo(
                            setName,
                            manager.getInfo("name"),
                            e.target.value,
                            "name"
                        )
                    ]);
                }}
                value={name}
                placeholder={t("bankInfo.name")}
            />

            <div className={"fields"}>
                <span>
                    <label htmlFor={"IENG"}>{t("bankInfo.engineer")}</label>
                    <input
                        className={"pretty_input"}
                        id={"IENG"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setEngineer,
                                    manager.getInfo("engineer") ?? "",
                                    e.target.value,
                                    "engineer"
                                )
                            ]);
                        }}
                        value={engineer}
                        placeholder={t("bankInfo.engineer")}
                    />
                </span>

                <span>
                    <label htmlFor={"ICRD"}>{t("bankInfo.creationDate")}</label>
                    <input
                        type={"datetime-local"}
                        className={"pretty_input hover_brightness"}
                        id={"ICRD"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setDate,
                                    manager.getInfo("creationDate") ??
                                        new Date(),
                                    e.target.valueAsDate ?? new Date(),
                                    "creationDate"
                                )
                            ]);
                        }}
                        value={date.toISOString().slice(0, 16)} // Format to 'YYYY-MM-DDTHH:MM' so input is happy
                        placeholder={t("bankInfo.creationDate")}
                    />
                </span>

                <span>
                    <label htmlFor={"IPRD"}>{t("bankInfo.product")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"IPRD"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setProd,
                                    manager.getInfo("product") ?? "",
                                    e.target.value,
                                    "product"
                                )
                            ]);
                        }}
                        value={prod}
                        placeholder={t("bankInfo.product")}
                    />
                </span>

                <span>
                    <label htmlFor={"ICOP"}>{t("bankInfo.copyright")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"ICOP"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setCopy,
                                    manager.getInfo("copyright") ?? "",
                                    e.target.value,
                                    "copyright"
                                )
                            ]);
                        }}
                        value={copy}
                        placeholder={t("bankInfo.copyright")}
                    />
                </span>

                <span>
                    <label htmlFor={"ISBJ"}>{t("bankInfo.subject")}</label>
                    <input
                        className={"pretty_input hover_brightness"}
                        id={"ISBJ"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setSubject,
                                    manager.getInfo("subject") ?? "",
                                    e.target.value,
                                    "subject"
                                )
                            ]);
                        }}
                        value={subject}
                        placeholder={t("bankInfo.subject")}
                    />
                </span>
            </div>
            <div className={"comment"}>
                <textarea
                    className={"pretty_input hover_brightness"}
                    id={"ICMT"}
                    onChange={(e) => {
                        manager.modifyBank([
                            new SetBankInfo(
                                setCmt,
                                manager.getInfo("comment") ?? "",
                                e.target.value,
                                "comment"
                            )
                        ]);
                    }}
                    value={cmt}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
