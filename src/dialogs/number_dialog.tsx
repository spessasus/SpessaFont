import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalDialog } from "./modal_dialog.tsx";
import type { AskNumberOptions } from "./dialogs_context.ts";

interface NumberDialogProps {
    options: AskNumberOptions;
    onAnswer: (value: number | undefined) => void;
}

export function NumberDialog({ options, onAnswer }: NumberDialogProps) {
    const { t } = useTranslation();
    const { title, label, initial, min, max, step } = options;
    const [text, setText] = useState(String(initial));
    const value = Number(text);
    const isValid = text.trim() !== "" && value >= min && value <= max;

    return (
        <ModalDialog
            title={title}
            className={"number_dialog"}
            onCancel={() => onAnswer(undefined)}
        >
            <form
                method={"dialog"}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (isValid) {
                        onAnswer(value);
                    }
                }}
            >
                <label className={"number_dialog_field"}>
                    <span>{label}</span>
                    <input
                        className={"pretty_input"}
                        type={"number"}
                        autoFocus={true}
                        min={min}
                        max={max}
                        step={step}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </label>
                <div className={"modal_dialog_buttons"}>
                    <button
                        type={"button"}
                        className={"pretty_button hover_brightness"}
                        onClick={() => onAnswer(undefined)}
                    >
                        {t("contextMenu.cancel")}
                    </button>
                    <button
                        type={"submit"}
                        className={"pretty_button hover_brightness"}
                        disabled={!isValid}
                    >
                        {t("contextMenu.ok")}
                    </button>
                </div>
            </form>
        </ModalDialog>
    );
}
