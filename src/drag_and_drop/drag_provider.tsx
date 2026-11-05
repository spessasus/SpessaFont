import "./drag_and_drop.css";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { DragController } from "./drag_controller.ts";
import { DragContext } from "./drag_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";

interface DragProviderProps {
    children?: ReactNode;
}

/**
 * Owns the element drags and draws the label that follows the pointer.
 */
export function DragProvider({ children }: DragProviderProps) {
    const [controller] = useState(() => new DragController());
    const state = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot
    );
    useEventListener(document, "pointermove", (e) => controller.move(e));
    useEventListener(document, "pointerup", () => controller.release());
    useEventListener(document, "pointercancel", () => controller.cancel());
    useEventListener(globalThis, "blur", () => controller.cancel());
    useEventListener(document, "keydown", (e) => {
        if (e.key === "Escape") {
            controller.cancel();
        }
    });

    return (
        <DragContext value={controller}>
            {children}
            {state ? (
                <div
                    className={`drag_label ${state.overId ? "accepted" : ""}`}
                    style={{
                        "--drag-x": `${state.x}px`,
                        "--drag-y": `${state.y}px`
                    }}
                    aria-hidden={true}
                >
                    {state.payload.label}
                </div>
            ) : null}
        </DragContext>
    );
}
