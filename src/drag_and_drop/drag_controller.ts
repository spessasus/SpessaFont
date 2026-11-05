import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEntity } from "../core_backend/bank_view.ts";

/**
 * What is being dragged: elements of one bank.
 */
export interface DragPayload {
    readonly session: BankSession;
    readonly entities: readonly BankEntity[];
    /**
     * What the label that follows the pointer says, made by the source from the views.
     */
    readonly label: string;
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
 * Lists that scroll while a drag is near their top or bottom edge carry this attribute.
 */
export const DRAG_SCROLL_ATTRIBUTE = "data-drag-scroll";
const DRAG_SCROLL_SELECTOR = "[data-drag-scroll]";
/**
 * How close to a list's edge the pointer starts scrolling it, and the fastest scroll, in pixels
 * (per frame).
 */
const SCROLL_EDGE = 40;
const MAX_SCROLL_STEP = 16;

/**
 * Releasing a drag also clicks the element under the pointer, which must not count.
 */
function swallowClick(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
}

/**
 * The list under the pointer and how far to scroll it, when the pointer is near its top or
 * bottom edge.
 */
function getEdgeScroll(x: number, y: number) {
    const list = document.elementFromPoint(x, y)?.closest(DRAG_SCROLL_SELECTOR);
    if (!list) {
        return undefined;
    }
    const { top, bottom } = list.getBoundingClientRect();
    const edge = Math.min(SCROLL_EDGE, (bottom - top) / 4);
    const depth =
        y < top + edge
            ? y - top - edge
            : y > bottom - edge
              ? y - bottom + edge
              : 0;
    return depth === 0 || edge <= 0
        ? undefined
        : { list, step: Math.round((depth / edge) * MAX_SCROLL_STEP) };
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
    private scrollFrame: number | undefined;

    public readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public readonly getSnapshot = () => this.state;

    private setState(state: DragState | null) {
        this.state = state;
        if (!state && this.scrollFrame !== undefined) {
            cancelAnimationFrame(this.scrollFrame);
            this.scrollFrame = undefined;
        }
        for (const listener of this.listeners) {
            listener();
        }
    }

    /**
     * Scrolls the list under the pointer every frame while the pointer stays near its edge,
     * so a drag reaches rows out of view without the mouse wheel.
     */
    private scrollNearEdge() {
        if (this.scrollFrame !== undefined) {
            return;
        }
        const step = () => {
            this.scrollFrame = undefined;
            const { state } = this;
            const scroll = state ? getEdgeScroll(state.x, state.y) : undefined;
            if (!state || !scroll) {
                return;
            }
            scroll.list.scrollTop += scroll.step;
            // Other rows are under the pointer now
            this.setState({
                ...state,
                overId: this.findTarget(state.x, state.y, state.payload)
            });
            this.scrollFrame = requestAnimationFrame(step);
        };
        this.scrollFrame = requestAnimationFrame(step);
    }

    /**
     * Swallows the click that ends the press of a cancelled drag. Escape cancels while the
     * button is held, and its release clicks what is under it. After a blur or a
     * pointercancel the release happens elsewhere, so the next press ends the swallowing
     * instead, and its own click counts.
     */
    private swallowClickOfPress() {
        const stop = () => {
            document.removeEventListener("click", swallowClick, {
                capture: true
            });
            document.removeEventListener("pointerup", stopAfterClick, {
                capture: true
            });
            document.removeEventListener("pointerdown", stop, {
                capture: true
            });
        };
        // The click comes right after the release, in the same task
        const stopAfterClick = () => requestAnimationFrame(stop);
        document.addEventListener("click", swallowClick, { capture: true });
        document.addEventListener("pointerup", stopAfterClick, {
            capture: true,
            once: true
        });
        document.addEventListener("pointerdown", stop, {
            capture: true,
            once: true
        });
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
            this.scrollNearEdge();
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
        this.scrollNearEdge();
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
        this.swallowClickOfPress();
    }
}
