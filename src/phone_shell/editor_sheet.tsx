import { useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "./back_stack.ts";
import { getSheetDragResult } from "./editor_sheet_drag.ts";
import { CloseIcon } from "../utils/icons/app_icons.tsx";
import "./editor_sheet.css";

interface EditorSheetProps {
    /**
     * Sits left of the close button and holds the element with `labelId`
     */
    header: ReactNode;
    labelId: string;
    onClose: () => void;
    children: ReactNode;
}

/**
 * A docked, non-modal panel rendered in place, so what is around it stays usable.
 */
export function EditorSheet({
    header,
    labelId,
    onClose,
    children
}: EditorSheetProps) {
    const { t } = useTranslation();
    const [isFull, setIsFull] = useState(false);
    const dragStartY = useRef<number | null>(null);

    useBackHandler(true, BACK_LEVELS.transient, () => {
        onClose();
        return true;
    });

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartY.current = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStartY.current === null) {
            return;
        }
        const result = getSheetDragResult(
            isFull,
            event.clientY - dragStartY.current
        );
        dragStartY.current = null;
        if (result === "close") {
            onClose();
        } else {
            setIsFull(result === "full");
        }
    };

    return (
        <section
            className="editor_sheet"
            data-full={isFull}
            role="dialog"
            aria-modal="false"
            aria-labelledby={labelId}
        >
            <div
                className="editor_sheet_grab"
                aria-hidden="true"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                    dragStartY.current = null;
                }}
            >
                <div className="editor_sheet_grab_bar" />
            </div>
            <header className="editor_sheet_header">
                <div className="editor_sheet_title">{header}</div>
                <button
                    type="button"
                    className="plain_button editor_sheet_close"
                    aria-label={t("menuBarLocale.file.close")}
                    onClick={onClose}
                >
                    <CloseIcon />
                </button>
            </header>
            <div className="editor_sheet_body">{children}</div>
        </section>
    );
}
