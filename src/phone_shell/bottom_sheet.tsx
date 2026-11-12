import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { usePresence } from "../hooks/use_presence.ts";
import { rememberFocus } from "../utils/focus_return.ts";
import { BACK_LEVELS } from "./back_stack.ts";
import { CloseIcon } from "../utils/icons/app_icons.tsx";
import "./bottom_sheet.css";

interface BottomSheetProps {
    title?: string;
    onClose: () => void;
    children: ReactNode;
}

/**
 * A modal sheet anchored to the bottom, drawn in a portal over everything (the drawer too).
 * Inside `Presence` it slides away when closed.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const bodyRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const { ref, isClosing } = usePresence<HTMLElement>();
    const restoreFocus = useRef<(() => void) | null>(null);
    const state = isClosing ? "closing" : "open";

    useBackHandler(true, BACK_LEVELS.transient, () => {
        onClose();
        return true;
    });

    // The focus goes back when the sheet starts to slide away, and comes in again when it
    // opens again before it is gone
    useEffect(() => {
        if (isClosing) {
            return;
        }
        restoreFocus.current = rememberFocus();
        const first = bodyRef.current?.querySelector<HTMLElement>(
            "button:not(:disabled)"
        );
        (first ?? closeRef.current)?.focus();
        return () => {
            restoreFocus.current?.();
            restoreFocus.current = null;
        };
    }, [isClosing]);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") {
            return;
        }
        event.stopPropagation();
        onClose();
    };

    return createPortal(
        <>
            <div
                className="bottom_sheet_scrim"
                data-state={state}
                onClick={isClosing ? undefined : onClose}
            />
            <section
                ref={ref}
                className="bottom_sheet"
                data-state={state}
                inert={isClosing}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title === undefined ? undefined : titleId}
                onKeyDown={handleKeyDown}
            >
                <div className="bottom_sheet_grab" aria-hidden="true" />
                <header className="bottom_sheet_header">
                    <h2 id={titleId} className="bottom_sheet_title">
                        {title}
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        className="plain_button bottom_sheet_close"
                        aria-label={t("menuBarLocale.file.close")}
                        onClick={onClose}
                    >
                        <CloseIcon />
                    </button>
                </header>
                <div ref={bodyRef} className="bottom_sheet_body">
                    {children}
                </div>
            </section>
        </>,
        document.body
    );
}
