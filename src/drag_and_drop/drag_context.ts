import {
    createContext,
    type PointerEvent,
    useContext,
    useEffect,
    useEffectEvent,
    useId,
    useSyncExternalStore
} from "react";
import {
    DROP_TARGET_ATTRIBUTE,
    type DragController,
    type DragPayload
} from "./drag_controller.ts";

export const DragContext = createContext<DragController | null>(null);

function useDragController() {
    const controller = useContext(DragContext);
    if (!controller) {
        throw new Error("Used without DragProvider context!");
    }
    return controller;
}

/**
 * Returns a pointer down handler that starts dragging the payload once the pointer moves.
 */
export function useDragSource() {
    const controller = useDragController();
    return (event: PointerEvent, payload: DragPayload) =>
        controller.press(event.nativeEvent, payload);
}

interface DropTargetOptions {
    accepts: (payload: DragPayload) => boolean;
    onDrop: (payload: DragPayload) => void;
}

/**
 * Makes an element a drop target. Spread the returned props on it. `data-drop-over` is set
 * while an accepted payload is over it, for the CSS.
 */
export function useDropTarget({ accepts, onDrop }: DropTargetOptions) {
    const controller = useDragController();
    const id = useId();
    const canAccept = useEffectEvent(accepts);
    const drop = useEffectEvent(onDrop);
    useEffect(
        () =>
            controller.register(id, {
                accepts: (payload) => canAccept(payload),
                drop: (payload) => drop(payload)
            }),
        [controller, id]
    );
    const isOver = useSyncExternalStore(
        controller.subscribe,
        () => controller.getSnapshot()?.overId === id
    );
    return {
        [DROP_TARGET_ATTRIBUTE]: id,
        "data-drop-over": isOver
    };
}
