import "./virtual_item_list.css";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getObjectId } from "../utils/object_id.ts";
import { DRAG_SCROLL_ATTRIBUTE } from "../drag_and_drop/drag_controller.ts";

const DEFAULT_ROW_ESTIMATE = 30;
const OVERSCAN = 5;
/**
 * The rows mark the button that takes the focus with this attribute.
 */
const ROW_FOCUS_SELECTOR = "[data-list-row]";

/**
 * Asks a list to move the keyboard focus to an item's row. A new object for each request, so
 * the list carries it out once.
 */
export interface FocusRequest {
    readonly item: object;
}

interface VirtualItemListProps<T extends object> {
    items: readonly T[];
    /**
     * The item to keep in view. The list scrolls to it when it changes or moves.
     */
    focusedItem: T | undefined;
    /**
     * Focuses the requested item's row once it is rendered (after the scroll to it).
     */
    focusRequest?: FocusRequest | null;
    renderItem: (item: T) => ReactNode;
    /**
     * The row height in pixels before a row is measured.
     */
    rowEstimate?: number;
}

/**
 * A scrollable list that only renders the visible rows, keyed by item identity.
 */
export function VirtualItemList<T extends object>({
    items,
    focusedItem,
    focusRequest = null,
    renderItem,
    rowEstimate = DEFAULT_ROW_ESTIMATE
}: VirtualItemListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);
    // A list that mounts later (an opened section) does not take an old request
    const handledRequest = useRef(focusRequest);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowEstimate,
        overscan: OVERSCAN,
        getItemKey: (index) => getObjectId(items[index])
    });

    const focusedIndex = focusedItem ? items.indexOf(focusedItem) : -1;
    useEffect(() => {
        if (focusedIndex !== -1) {
            // "auto" only scrolls when the item is out of view, so clicks do not jump
            virtualizer.scrollToIndex(focusedIndex, { align: "auto" });
        }
    }, [focusedIndex, virtualizer]);

    // The requested row may only mount after the scroll, so it is focused when it attaches
    const attachFocusedRow = (element: HTMLDivElement | null) => {
        virtualizer.measureElement(element);
        if (
            !element ||
            focusRequest?.item !== focusedItem ||
            handledRequest.current === focusRequest
        ) {
            return;
        }
        handledRequest.current = focusRequest;
        element
            .querySelector<HTMLElement>(ROW_FOCUS_SELECTOR)
            ?.focus({ preventScroll: true });
    };

    return (
        <div
            className={"menu_list_scrollable"}
            ref={parentRef}
            // Chromium gives a scroller without focusable rows a Tab stop of its own, which in
            // the element picker came between the search and Cancel. The rows handle the keys
            tabIndex={-1}
            {...{ [DRAG_SCROLL_ATTRIBUTE]: true }}
        >
            <div
                className={"item_group"}
                style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
                {virtualizer.getVirtualItems().map((row) => (
                    <div
                        key={row.key}
                        ref={
                            row.index === focusedIndex
                                ? attachFocusedRow
                                : virtualizer.measureElement
                        }
                        data-index={row.index}
                        className={"virtual_item"}
                        style={{ transform: `translateY(${row.start}px)` }}
                    >
                        {renderItem(items[row.index])}
                    </div>
                ))}
            </div>
        </div>
    );
}
