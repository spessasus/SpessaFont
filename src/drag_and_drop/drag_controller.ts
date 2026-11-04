import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEntity } from "../core_backend/bank_view.ts";

/**
 * What is being dragged: elements of one bank.
 */
export interface DragPayload {
    readonly session: BankSession;
    readonly entities: readonly BankEntity[];
}

export interface DropTarget {
    accepts: (payload: DragPayload) => boolean;
    drop: (payload: DragPayload) => void;
}

export interface DragState {
    readonly payload: DragPayload;
    readonly x: number;
    readonly y: number;
    /**
     * The accepting target under the pointer.
     */
    readonly overId: string | undefined;
}

/**
 * Pixels the pointer moves before a press becomes a drag, so clicks stay clicks.
 */
const DRAG_THRESHOLD = 6;
export const DROP_TARGET_ATTRIBUTE = "data-drop-target";
const DROP_TARGET_SELECTOR = "[data-drop-target]";

/**
 * Releasing a drag also clicks the element under the pointer, which must not count.
 */
function swallowClick(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
}

interface PendingDrag {
    payload: DragPayload;
    x: number;
    y: number;
    pointerId: number;
}

/**
 * Element drags inside the app, done with pointer events. HTML drag and drop cannot start on a
 * button in Firefox, and the list rows are buttons. Drop targets are marked in the DOM with
 * `DROP_TARGET_ATTRIBUTE` and found under the pointer.
 * Observable with `subscribe` and `getSnapshot` for `useSyncExternalStore`.
 */
export class DragController {
    private readonly targets = new Map<string, DropTarget>();
    private readonly listeners = new Set<() => void>();
    private pending: PendingDrag | undefined;
    private state: DragState | null = null;

    public readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public readonly getSnapshot = () => this.state;

    private setState(state: DragState | null) {
        this.state = state;
        for (const listener of this.listeners) {
            listener();
        }
    }

    private findTarget(x: number, y: number, payload: DragPayload) {
        let element = document
            .elementFromPoint(x, y)
            ?.closest(DROP_TARGET_SELECTOR);
        // Nested targets: the innermost one that takes the payload wins
        while (element) {
            const id = element.getAttribute(DROP_TARGET_ATTRIBUTE) ?? "";
            if (this.targets.get(id)?.accepts(payload)) {
                return id;
            }
            element = element.parentElement?.closest(DROP_TARGET_SELECTOR);
        }
        return undefined;
    }

    public register(id: string, target: DropTarget) {
        this.targets.set(id, target);
        return () => {
            this.targets.delete(id);
        };
    }

    /**
     * Arms a drag from a press. It starts once the pointer moves far enough.
     * Touch is left alone, there a long press opens the menu and a swipe scrolls.
     */
    public press(event: PointerEvent, payload: DragPayload) {
        if (event.button !== 0 || event.pointerType === "touch") {
            return;
        }
        this.pending = {
            payload,
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId
        };
    }

    public move(event: PointerEvent) {
        const { pending, state } = this;
        if (state) {
            // Dragging over text would select it
            getSelection()?.removeAllRanges();
            this.setState({
                ...state,
                x: event.clientX,
                y: event.clientY,
                overId: this.findTarget(
                    event.clientX,
                    event.clientY,
                    state.payload
                )
            });
            return;
        }
        if (pending?.pointerId !== event.pointerId) {
            return;
        }
        const distance = Math.hypot(
            event.clientX - pending.x,
            event.clientY - pending.y
        );
        if (distance < DRAG_THRESHOLD) {
            return;
        }
        this.pending = undefined;
        this.setState({
            payload: pending.payload,
            x: event.clientX,
            y: event.clientY,
            overId: this.findTarget(
                event.clientX,
                event.clientY,
                pending.payload
            )
        });
    }

    public release() {
        this.pending = undefined;
        const { state } = this;
        if (!state) {
            return;
        }
        this.setState(null);
        // The click comes right after the release, in the same task
        document.addEventListener("click", swallowClick, { capture: true });
        requestAnimationFrame(() =>
            document.removeEventListener("click", swallowClick, {
                capture: true
            })
        );
        if (state.overId) {
            this.targets.get(state.overId)?.drop(state.payload);
        }
    }

    public cancel() {
        this.pending = undefined;
        if (!this.state) {
            return;
        }
        this.setState(null);
        // Escape cancels while the button is still held, its release would click what is under it
        document.addEventListener("click", swallowClick, { capture: true });
        document.addEventListener(
            "pointerup",
            () =>
                requestAnimationFrame(() =>
                    document.removeEventListener("click", swallowClick, {
                        capture: true
                    })
                ),
            { capture: true, once: true }
        );
    }
}
