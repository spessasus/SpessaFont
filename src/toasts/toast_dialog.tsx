import { type ReactNode, useEffect, useId, useRef } from "react";
import { rememberFocus } from "../utils/focus_return.ts";

export interface ToastDialogButton {
    label: string;
    onClick?: () => void;
}

interface ToastDialogProps {
    children: ReactNode;
    /**
     * The buttons in display order. The last one gets the focus and answers Escape, so put
     * the safe choice there.
     */
    buttons: ToastDialogButton[];
    onDismiss: () => void;
}

/**
 * The content of a toast that asks the user something, with real buttons.
 * It takes the focus like a dialog and gives it back when answered.
 */
export function ToastDialog({
    children,
    buttons,
    onDismiss
}: ToastDialogProps) {
    const labelId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const safeButtonRef = useRef<HTMLButtonElement>(null);
    const restoreFocusRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        const restore = rememberFocus();
        restoreFocusRef.current = restore;
        safeButtonRef.current?.focus();
        return () => {
            // Pushed out by newer toasts while focused (or StrictMode's second run)
            if (dialog?.contains(document.activeElement)) {
                restore();
            }
        };
    }, []);

    const answer = (button: ToastDialogButton) => {
        onDismiss();
        restoreFocusRef.current?.();
        button.onClick?.();
    };

    const safeButton = buttons.at(-1);
    return (
        <div
            ref={dialogRef}
            className={"toast_col"}
            role={"alertdialog"}
            aria-labelledby={labelId}
            onKeyDown={(e) => {
                if (!safeButton || e.key !== "Escape") {
                    return;
                }
                e.preventDefault();
                answer(safeButton);
            }}
        >
            <div id={labelId} className={"toast_col"}>
                {children}
            </div>
            <div className={"toast_row"}>
                {buttons.map((button) => (
                    <button
                        key={button.label}
                        ref={button === safeButton ? safeButtonRef : undefined}
                        type={"button"}
                        className={"pretty_outline toast_button"}
                        onClick={() => answer(button)}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
