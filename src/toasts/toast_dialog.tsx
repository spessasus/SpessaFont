import type { ReactNode } from "react";

export interface ToastDialogButton {
    label: string;
    onClick?: () => void;
}

interface ToastDialogProps {
    children: ReactNode;
    /**
     * The buttons in display order. The last one gets the focus, so put the safe choice there.
     */
    buttons: ToastDialogButton[];
    onDismiss: () => void;
}

/**
 * The content of a toast that asks the user something, with real buttons.
 */
export function ToastDialog({
    children,
    buttons,
    onDismiss
}: ToastDialogProps) {
    return (
        <div className={"toast_col"} role={"alertdialog"}>
            {children}
            <div className={"toast_row"}>
                {buttons.map((button, i) => (
                    <button
                        key={button.label}
                        type={"button"}
                        className={"pretty_outline toast_button"}
                        autoFocus={i === buttons.length - 1}
                        onClick={() => {
                            onDismiss();
                            button.onClick?.();
                        }}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
