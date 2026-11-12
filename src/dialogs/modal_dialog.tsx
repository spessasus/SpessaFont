import "./dialogs.css";
import "./dialogs_phone.css";
import {
    type MouseEvent,
    type ReactNode,
    useEffect,
    useEffectEvent,
    useRef
} from "react";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { usePresence } from "../hooks/use_presence.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { rememberFocus } from "../utils/focus_return.ts";

interface ModalDialogProps {
    title: string;
    className: string;
    children: ReactNode;
    /**
     * Escape and a click outside the dialog cancel it.
     */
    onCancel: () => void;
    /**
     * Keeps the focus on the dialog itself when it opens, so no field takes it and raises the
     * soft keyboard.
     */
    doesSkipFocus?: boolean;
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
 * A native modal dialog, shown while it is mounted. The focus goes back to where it was when
 * it closes. Inside `Presence` it plays its exit before it closes, still modal, so nothing
 * under it takes a tap meanwhile.
 */
export function ModalDialog({
    title,
    className,
    children,
    onCancel,
    doesSkipFocus = false
}: ModalDialogProps) {
    const { ref: dialogRef, isClosing } = usePresence<HTMLDialogElement>();
    const backdropPress = useRef(false);
    const handleCancel = isClosing ? () => undefined : onCancel;
    useBackHandler(true, BACK_LEVELS.transient, () => {
        onCancel();
        return true;
    });
    // Read when the dialog opens only, a later change must not show it again
    const focusDialog = useEffectEvent(() => {
        if (doesSkipFocus) {
            // showModal focuses the first field, which would raise the soft keyboard
            dialogRef.current?.focus();
        }
    });
    useEffect(() => {
        const dialog = dialogRef.current;
        // The browser would return the focus itself, but React removes the dialog first
        const restoreFocus = rememberFocus();
        dialog?.showModal();
        focusDialog();
        return () => {
            dialog?.close();
            restoreFocus();
        };
    }, [dialogRef]);
    return (
        <dialog
            ref={dialogRef}
            className={`modal_dialog ${className}`}
            data-state={isClosing ? "closing" : "open"}
            inert={isClosing}
            aria-label={title}
            tabIndex={doesSkipFocus ? -1 : undefined}
            onCancel={(e) => {
                e.preventDefault();
                handleCancel();
            }}
            onPointerDown={(e) => {
                backdropPress.current = isOnBackdrop(e);
            }}
            onClick={(e) => {
                // Both the press and the release, so a text selection dragged out of the
                // search field does not close it
                if (backdropPress.current && isOnBackdrop(e)) {
                    handleCancel();
                }
            }}
        >
            <h2 className={"modal_dialog_title"}>{title}</h2>
            {children}
        </dialog>
    );
}
