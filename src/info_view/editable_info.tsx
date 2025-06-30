import type { SoundFontInfoType } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { HistoryAction } from "../core_backend/history.ts";

class SetBankInfo implements HistoryAction {
    callback: (s: string) => void;
    private readonly oldVal: string;
    private readonly newVal: string;
    private readonly fourCC: SoundFontInfoType;

    constructor(
        callback: { (s: string): void },
        oldVal: string,
        newVal: string,
        fourCC: SoundFontInfoType
    ) {
        this.callback = callback;
        this.oldVal = oldVal;
        this.newVal = newVal;
        this.fourCC = fourCC;
    }

    do(b: SoundBankManager) {
        b.soundFontInfo[this.fourCC] = this.newVal;
        this.callback(this.newVal);
    }

    undo(b: SoundBankManager) {
        b.soundFontInfo[this.fourCC] = this.oldVal;
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

    const [date, setDate] = useState("");
    const [engineer, setEngineer] = useState("");
    const [prod, setProd] = useState("");
    const [copy, setCopy] = useState("");
    const [cmt, setCmt] = useState("");
    useEffect(() => {
        document.title = `SpessaFont - ${manager.getBankName(t("bankInfo.unnamed"))}`;
    }, [manager, t, name]);

    const bank = manager;

    useEffect(() => {
        if (bank !== undefined) {
            setName(manager.getInfo("INAM"));
            setDate(manager.getInfo("ICRD"));
            setEngineer(manager.getInfo("IENG"));
            setProd(manager.getInfo("IPRD"));
            setCopy(manager.getInfo("ICOP"));
            setCmt(manager.getInfo("ICMT"));
        }
    }, [bank, manager, setName]);

    return (
        <div className={"editable"}>
            <input
                className={"pretty_input"}
                id={"INAM"}
                onChange={(e) => {
                    manager.modifyBank([
                        new SetBankInfo(
                            setName,
                            manager.getInfo("INAM"),
                            e.target.value,
                            "INAM"
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
                                    manager.getInfo("IENG"),
                                    e.target.value,
                                    "IENG"
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
                        className={"pretty_input"}
                        id={"ICRD"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setDate,
                                    manager.getInfo("ICRD"),
                                    e.target.value,
                                    "ICRD"
                                )
                            ]);
                        }}
                        value={date}
                        placeholder={t("bankInfo.creationDate")}
                    />
                </span>

                <span>
                    <label htmlFor={"IPRD"}>{t("bankInfo.product")}</label>
                    <input
                        className={"pretty_input"}
                        id={"IPRD"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setProd,
                                    manager.getInfo("IPRD"),
                                    e.target.value,
                                    "IPRD"
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
                        className={"pretty_input"}
                        id={"ICOP"}
                        onChange={(e) => {
                            manager.modifyBank([
                                new SetBankInfo(
                                    setCopy,
                                    manager.getInfo("ICOP"),
                                    e.target.value,
                                    "ICOP"
                                )
                            ]);
                        }}
                        value={copy}
                        placeholder={t("bankInfo.copyright")}
                    />
                </span>
            </div>
            <div className={"comment"}>
                <textarea
                    className={"pretty_input"}
                    id={"ICMT"}
                    onChange={(e) => {
                        manager.modifyBank([
                            new SetBankInfo(
                                setCmt,
                                manager.getInfo("ICMT"),
                                e.target.value,
                                "ICMT"
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
