import { useTranslation } from "react-i18next";
import type { SoundBankInfoData } from "spessasynth_core";
import { SetBankInfoAction } from "./set_bank_info_action.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { WaitingTextArea } from "../fancy_inputs/waiting_input/waiting_text_area.tsx";

const MS_PER_MINUTE = 60_000;

/**
 * Formats a date as local 'YYYY-MM-DDTHH:MM', which is what datetime-local inputs use.
 */
function toLocalDateTimeValue(date: Date) {
    const local = new Date(
        date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE
    );
    if (Number.isNaN(local.getTime())) {
        return "";
    }
    // Years past 9999 do not fit the field
    return local.getUTCFullYear() > 9999
        ? ""
        : local.toISOString().slice(0, 16);
}

interface InfoTextFieldProps {
    id: string;
    label: string;
    value: string;
    onCommit: (value: string) => void;
}

function InfoTextField({ id, label, value, onCommit }: InfoTextFieldProps) {
    return (
        <span>
            <label htmlFor={id}>{label}</label>
            <WaitingInput
                className={"pretty_input hover_brightness"}
                id={id}
                setValue={(v) => {
                    onCommit(v);
                    return v;
                }}
                value={value}
                placeholder={label}
            />
        </span>
    );
}

export function EditableBankInfo() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const info = useBankSnapshot(session.store, (s) => s.info);

    function setInfo<K extends keyof SoundBankInfoData>(
        fourCC: K,
        value: SoundBankInfoData[K]
    ) {
        apply([new SetBankInfoAction(fourCC, info[fourCC], value)]);
    }

    const getTextField = (
        field: "engineer" | "product" | "copyright" | "subject",
        id: string,
        label: string
    ) => (
        <InfoTextField
            id={id}
            label={label}
            value={info[field] ?? ""}
            onCommit={(v) => setInfo(field, v)}
        />
    );

    return (
        <div className={"editable"}>
            <WaitingInput
                className={"pretty_input hover_brightness"}
                id={"INAM"}
                aria-label={t("bankInfo.name")}
                setValue={(name) => {
                    setInfo("name", name);
                    return name;
                }}
                value={info.name}
                placeholder={t("bankInfo.name")}
            />

            <div className={"fields"}>
                {getTextField("engineer", "IENG", t("bankInfo.engineer"))}

                <span>
                    <label htmlFor={"ICRD"}>{t("bankInfo.creationDate")}</label>
                    {/* Commits on blur, typing a year digit by digit would make an undo step each */}
                    <input
                        type={"datetime-local"}
                        className={"pretty_input hover_brightness"}
                        id={"ICRD"}
                        // A new value from outside (undo, another bank) replaces the field
                        key={toLocalDateTimeValue(info.creationDate)}
                        defaultValue={toLocalDateTimeValue(info.creationDate)}
                        // toISOString writes longer years in another form, which breaks the field
                        min={"0001-01-01T00:00"}
                        max={"9999-12-31T23:59"}
                        onBlur={(e) => {
                            // The value is local time, valueAsDate does not work for this input type
                            const date = new Date(e.target.value);
                            const value = toLocalDateTimeValue(date);
                            if (
                                !Number.isNaN(date.getTime()) &&
                                value !==
                                    toLocalDateTimeValue(info.creationDate)
                            ) {
                                setInfo("creationDate", date);
                            }
                        }}
                    />
                </span>

                {getTextField("product", "IPRD", t("bankInfo.product"))}
                {getTextField("copyright", "ICOP", t("bankInfo.copyright"))}
                {getTextField("subject", "ISBJ", t("bankInfo.subject"))}
            </div>
            <div className={"comment"}>
                <WaitingTextArea
                    className={"pretty_input hover_brightness"}
                    id={"ICMT"}
                    aria-label={t("bankInfo.description")}
                    setValue={(v) => setInfo("comment", v)}
                    value={info.comment ?? ""}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
