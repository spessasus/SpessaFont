import "./dialogs.css";
import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";

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
 * Whether the pointer is on the backdrop: the event targets the dialog itself (the backdrop
 * counts as the dialog) and lies outside its box, so its padding does not count.
 */
function isOnBackdrop(e: MouseEvent<HTMLDialogElement>) {
    if (e.target !== e.currentTarget) {
        return false;
    }
    const box = e.currentTarget.getBoundingClientRect();
    return (
        e.clientX < box.left ||
        e.clientX > box.right ||
        e.clientY < box.top ||
        e.clientY > box.bottom
    );
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
    const backdropPress = useRef(false);
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
            onPointerDown={(e) => {
                backdropPress.current = isOnBackdrop(e);
            }}
            onClick={(e) => {
                // Both the press and the release, so a text selection dragged out of the
                // search field does not close it
                if (backdropPress.current && isOnBackdrop(e)) {
                    onCancel();
                }
            }}
        >
            <h2 className={"modal_dialog_title"}>{title}</h2>
            {children}
        </dialog>
    );
}
