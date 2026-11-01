import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { ToastDialog, type ToastDialogButton } from "./toast_dialog.tsx";

interface ToastDialogOptions {
    content: ReactNode;
    buttons: ToastDialogButton[];
    isError?: boolean;
}

/**
 * Shows a toast that stays until one of its buttons is pressed.
 */
export function showToastDialog({
    content,
    buttons,
    isError = false
}: ToastDialogOptions) {
    const render = ({ id }: { id: string }) => (
        <ToastDialog buttons={buttons} onDismiss={() => toast.dismiss(id)}>
            {content}
        </ToastDialog>
    );
    if (isError) {
        toast.error(render, { duration: Infinity });
    } else {
        toast(render, { duration: Infinity });
    }
}
