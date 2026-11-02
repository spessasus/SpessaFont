import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
    measureElement,
    observeElementOffset,
    useVirtualizer
} from "@tanstack/react-virtual";
import { getObjectId } from "../utils/object_id.ts";

const ESTIMATED_ROW_HEIGHT = 30;
const OVERSCAN = 5;

interface VirtualItemListProps<T extends object> {
    items: readonly T[];
    /**
     * The item to keep in view. The list scrolls to it when it changes or moves.
     */
    focusedItem: T | undefined;
    renderItem: (item: T) => ReactNode;
}

/**
 * A scrollable list that only renders the visible rows, keyed by item identity.
 */
export function VirtualItemList<T extends object>({
    items,
    focusedItem,
    renderItem
}: VirtualItemListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN,
        getItemKey: (index) => getObjectId(items[index]),
        // The editor is hidden while the settings are open, and a hidden row measures 0.
        // Caching that would stack the rows on top of each other once the list is shown again.
        measureElement: (element, entry, instance) =>
            element.checkVisibility()
                ? measureElement(element, entry, instance)
                : (instance.itemSizeCache.get(
                      instance.options.getItemKey(
                          instance.indexFromElement(element)
                      )
                  ) ?? ESTIMATED_ROW_HEIGHT),
        // A hidden list reads as scrolled to the top, and showing it again restores the
        // position without a scroll event, so the offset is read again on every resize
        observeElementOffset: (instance, onOffset) => {
            const unsubscribe = observeElementOffset(instance, onOffset);
            const element = instance.scrollElement;
            if (!element) {
                return unsubscribe;
            }
            const observer = new ResizeObserver(() =>
                onOffset(element.scrollTop, false)
            );
            observer.observe(element);
            return () => {
                unsubscribe?.();
                observer.disconnect();
            };
        }
    });

    const focusedIndex = focusedItem ? items.indexOf(focusedItem) : -1;
    useEffect(() => {
        if (focusedIndex !== -1) {
            // "auto" only scrolls when the item is out of view, so clicks do not jump
            virtualizer.scrollToIndex(focusedIndex, { align: "auto" });
        }
    }, [focusedIndex, virtualizer]);

    return (
        <div className={"menu_list_scrollable"} ref={parentRef}>
            <div
                className={"item_group"}
                style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
                {virtualizer.getVirtualItems().map((row) => (
                    <div
                        key={row.key}
                        ref={virtualizer.measureElement}
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
