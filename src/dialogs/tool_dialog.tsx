import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ModalDialog } from "./modal_dialog.tsx";

interface ToolDialogProps {
    title: string;
    /**
     * The fields and anything shown with them.
     */
    children: ReactNode;
    /**
     * False disables the apply button.
     */
    canApply: boolean;
    onCancel: () => void;
    onApply: () => void;
}

/**
 * The frame of a tool's dialog: its fields, then cancel and apply buttons.
 * Enter applies, Escape and a click outside cancel.
 */
export function ToolDialog({
    title,
    children,
    canApply,
    onCancel,
    onApply
}: ToolDialogProps) {
    const { t } = useTranslation();
    return (
        <ModalDialog
            title={title}
            className={"tool_dialog"}
            onCancel={onCancel}
        >
            {/* The fields are read and checked in JS, and the browser's step check would refuse
                valid values that are off the spinner's step */}
            <form
                method={"dialog"}
                noValidate={true}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (canApply) {
                        onApply();
                    }
                }}
            >
                {children}
                <div className={"modal_dialog_buttons"}>
                    <button
                        type={"button"}
                        className={"pretty_button hover_brightness"}
                        onClick={onCancel}
                    >
                        {t("contextMenu.cancel")}
                    </button>
                    <button
                        type={"submit"}
                        className={"pretty_button hover_brightness"}
                        disabled={!canApply}
                    >
                        {t("contextMenu.ok")}
                    </button>
                </div>
            </form>
        </ModalDialog>
    );
}
