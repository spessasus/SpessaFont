import type { BasicSoundBank, SoundFontInfoType } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type Manager from "../core_backend/manager.ts";
import type { HistoryAction } from "../core_backend/history.ts";

class SetBankInfo implements HistoryAction {
    callback: (s: string) => void;
    oldVal: string;
    newVal: string;
    fourCC: SoundFontInfoType;

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

    do(b: BasicSoundBank) {
        b.soundFontInfo[this.fourCC] = this.newVal;
        this.callback(this.newVal);
    }

    undo(b: BasicSoundBank) {
        b.soundFontInfo[this.fourCC] = this.oldVal;
        this.callback(this.oldVal);
    }
}

export function EditableBankInfo({ manager }: { manager: Manager }) {
    const { t } = useTranslation();

    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [engi, setEngi] = useState("");
    const [prod, setProd] = useState("");
    const [copy, setCopy] = useState("");
    const [cmt, setCmt] = useState("");
    useEffect(() => {
        document.title = `SpessaFont - ${name}`;
    }, [name]);

    const bank = manager.bank;

    useEffect(() => {
        const inf = (fourcc: SoundFontInfoType): string => {
            return bank?.soundFontInfo[fourcc]?.toString() || "";
        };
        if (bank !== undefined) {
            setName(inf("INAM"));
            setDate(inf("ICRD"));
            setEngi(inf("IENG"));
            setProd(inf("IPRD"));
            setCopy(inf("ICOP"));
            setCmt(inf("ICMT"));
        }
    }, [bank]);

    if (!bank) {
        return <div>ERROR</div>;
    }

    return (
        <div className={"editable"}>
            <input
                className={"pretty_input"}
                id={"INAM"}
                onChange={(e) => {
                    manager.modifyBank(
                        new SetBankInfo(
                            setName,
                            bank.soundFontInfo["INAM"].toString(),
                            e.target.value,
                            "INAM"
                        )
                    );
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
                            manager.modifyBank(
                                new SetBankInfo(
                                    setEngi,
                                    bank.soundFontInfo["IENG"].toString(),
                                    e.target.value,
                                    "IENG"
                                )
                            );
                        }}
                        value={engi}
                        placeholder={t("bankInfo.engineer")}
                    />
                </span>

                <span>
                    <label htmlFor={"ICRD"}>{t("bankInfo.creationDate")}</label>
                    <input
                        className={"pretty_input"}
                        id={"ICRD"}
                        onChange={(e) => {
                            manager.modifyBank(
                                new SetBankInfo(
                                    setDate,
                                    bank.soundFontInfo["ICRD"].toString(),
                                    e.target.value,
                                    "ICRD"
                                )
                            );
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
                            manager.modifyBank(
                                new SetBankInfo(
                                    setProd,
                                    bank.soundFontInfo["IPRD"].toString(),
                                    e.target.value,
                                    "IPRD"
                                )
                            );
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
                            manager.modifyBank(
                                new SetBankInfo(
                                    setProd,
                                    bank.soundFontInfo["ICOP"].toString(),
                                    e.target.value,
                                    "ICOP"
                                )
                            );
                        }}
                        value={copy}
                        placeholder={t("bankInfo.copyright")}
                    />
                </span>
            </div>
            <div className={"comment"}>
                <label htmlFor={"ICMT"}>{t("bankInfo.description")}</label>
                <textarea
                    className={"pretty_input"}
                    id={"ICMT"}
                    onChange={(e) => {
                        manager.modifyBank(
                            new SetBankInfo(
                                setCmt,
                                bank.soundFontInfo["ICMT"].toString(),
                                e.target.value,
                                "ICMT"
                            )
                        );
                    }}
                    value={cmt}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
