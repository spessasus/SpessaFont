import type { ReactNode } from "react";
import toast, { type Toast } from "react-hot-toast";
import { ToastDialog, type ToastDialogButton } from "./toast_dialog.tsx";

interface ToastDialogOptions {
    content: ReactNode;
    buttons: ToastDialogButton[];
    isError?: boolean;
    /**
     * Showing a question with the id of one on screen replaces it instead of stacking another,
     * and brings it back if newer toasts pushed it out.
     */
    id?: string;
}

/**
 * Shows a toast that stays until one of its buttons is pressed.
 * @returns the toast's id, for `toast.dismiss`
 */
export function showToastDialog({
    content,
    buttons,
    isError = false,
    id
}: ToastDialogOptions) {
    const render = ({ id: toastId, visible }: Toast) => (
        <ToastDialog
            buttons={buttons}
            isVisible={visible}
            onDismiss={() => toast.dismiss(toastId)}
        >
            {content}
        </ToastDialog>
    );
    const options = { duration: Infinity, id };
    return isError ? toast.error(render, options) : toast(render, options);
}
