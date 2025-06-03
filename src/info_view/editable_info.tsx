import type { BasicSoundBank, SoundFontInfoType } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export function EditableBankInfo({ bank }: { bank: BasicSoundBank }) {
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

    useEffect(() => {
        const inf = (fourcc: SoundFontInfoType): string => {
            return bank.soundFontInfo[fourcc]?.toString() || "";
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

    return (
        <div className={"editable"}>
            <input
                className={"pretty_input"}
                id={"INAM"}
                onChange={(e) => {
                    bank.soundFontInfo["INAM"] = e.target.value;
                    setName(e.target.value);
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
                            bank.soundFontInfo["IENG"] = e.target.value;
                            setEngi(e.target.value);
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
                            bank.soundFontInfo["ICRD"] = e.target.value;
                            setDate(e.target.value);
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
                            bank.soundFontInfo["IPRD"] = e.target.value;
                            setProd(e.target.value);
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
                            bank.soundFontInfo["ICOP"] = e.target.value;
                            setCopy(e.target.value);
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
                        bank.soundFontInfo["ICMT"] = e.target.value;
                        setCmt(e.target.value);
                    }}
                    value={cmt}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
