import "./dialogs.css";
import { type ReactNode, useEffect, useRef } from "react";

interface ModalDialogProps {
    title: string;
    className: string;
    children: ReactNode;
    /**
     * Escape and a click outside the dialog cancel it.
     */
    onCancel: () => void;
}

/**
 * A native modal dialog, shown while it is mounted.
 */
export function ModalDialog({
    title,
    className,
    children,
    onCancel
}: ModalDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);
    return (
        <dialog
            ref={dialogRef}
            className={`modal_dialog ${className}`}
            aria-label={title}
            onCancel={(e) => {
                e.preventDefault();
                onCancel();
            }}
            onClick={(e) => {
                // The backdrop counts as the dialog itself
                if (e.target === e.currentTarget) {
                    onCancel();
                }
            }}
        >
            <h2 className={"modal_dialog_title"}>{title}</h2>
            {children}
        </dialog>
    );
}
