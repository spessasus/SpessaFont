import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import type { SoundBankInfoData } from "spessasynth_core";
import { SetBankInfoAction } from "./set_bank_info_action.ts";
import { useLayout } from "../layout/layout_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { WaitingTextArea } from "../fancy_inputs/waiting_input/waiting_text_area.tsx";

const MS_PER_MINUTE = 60_000;

/**
 * An SF2 INFO text is at most 256 bytes with its closing zero, and core writes a byte per
 * character. The comment may be 65,536 bytes. DLS has no limits, but a name this long is enough.
 */
const INFO_TEXT_LENGTH = 255;
const COMMENT_LENGTH = 65_535;

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
                maxLength={INFO_TEXT_LENGTH}
                onCommit={(v) => {
                    onCommit(v);
                    return v;
                }}
                value={value}
                placeholder={label}
            />
        </span>
    );
}

interface CreationDateFieldProps {
    date: Date;
    onCommit: (date: Date) => void;
}

/**
 * Commits on blur, typing a year digit by digit would make an undo step each. The field is not
 * controlled, as a half typed date has no value to control it with.
 */
function CreationDateField({ date, onCommit }: CreationDateFieldProps) {
    const { t } = useTranslation();
    // Remounts the field, which shows the bank's date again after Escape or emptying it
    const [revision, setRevision] = useState(0);
    // Set by Escape, so the blur that follows does not apply the draft
    const cancelRef = useRef(false);
    const value = toLocalDateTimeValue(date);
    return (
        <span>
            <label htmlFor={"ICRD"}>{t("bankInfo.creationDate")}</label>
            <input
                type={"datetime-local"}
                className={"pretty_input hover_brightness"}
                id={"ICRD"}
                // A new value from outside (undo, another bank) replaces the field
                key={`${value}-${revision}`}
                defaultValue={value}
                // toISOString writes longer years in another form, which breaks the field
                min={"0001-01-01T00:00"}
                max={"9999-12-31T23:59"}
                onKeyDown={(e) => {
                    if (e.key !== "Escape") {
                        return;
                    }
                    // Only cancels the edit, not a dialog or menu around it
                    e.preventDefault();
                    e.stopPropagation();
                    cancelRef.current = true;
                    e.currentTarget.blur();
                }}
                onBlur={(e) => {
                    const isCanceled = cancelRef.current;
                    cancelRef.current = false;
                    // The value is local time, valueAsDate does not work for this input type
                    const typed = new Date(e.target.value);
                    const isValid = !Number.isNaN(typed.getTime());
                    if (
                        !isCanceled &&
                        isValid &&
                        toLocalDateTimeValue(typed) !== value
                    ) {
                        onCommit(typed);
                    } else if (e.target.value !== value) {
                        setRevision((r) => r + 1);
                    }
                }}
            />
        </span>
    );
}

export function EditableInfo() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const layout = useLayout();
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

    // SF2 saves write the subject at the end of the comment, and both must fit in one text
    const subjectLength = info.subject ? info.subject.length + 1 : 0;

    const nameInput = (
        <WaitingInput
            className={"pretty_input hover_brightness"}
            id={"INAM"}
            aria-label={t("bankInfo.name")}
            maxLength={INFO_TEXT_LENGTH}
            onCommit={(name) => {
                setInfo("name", name);
                return name;
            }}
            value={info.name}
            placeholder={t("bankInfo.name")}
        />
    );

    return (
        <div className={"editable"}>
            {layout === "phone" ? (
                <span className={"phone_info_field"}>
                    <label htmlFor={"INAM"}>{t("bankInfo.name")}</label>
                    {nameInput}
                </span>
            ) : (
                nameInput
            )}

            <div className={"fields"}>
                {getTextField("engineer", "IENG", t("bankInfo.engineer"))}
                <CreationDateField
                    date={info.creationDate}
                    onCommit={(date) => setInfo("creationDate", date)}
                />
                {getTextField("product", "IPRD", t("bankInfo.product"))}
                {getTextField("copyright", "ICOP", t("bankInfo.copyright"))}
                {getTextField("subject", "ISBJ", t("bankInfo.subject"))}
            </div>
            <div className={"comment"}>
                {layout === "phone" ? (
                    <label htmlFor={"ICMT"}>{t("bankInfo.description")}</label>
                ) : null}
                <WaitingTextArea
                    className={"pretty_input hover_brightness"}
                    id={"ICMT"}
                    aria-label={t("bankInfo.description")}
                    maxLength={COMMENT_LENGTH - subjectLength}
                    onCommit={(v) => setInfo("comment", v)}
                    value={info.comment ?? ""}
                    placeholder={t("bankInfo.description")}
                />
            </div>
        </div>
    );
}
