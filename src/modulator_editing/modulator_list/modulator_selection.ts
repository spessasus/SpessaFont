/**
 * The selection after clicking the item with `clickedId`. A click toggles that item. A shift
 * click with an anchor sets everything between the anchor and the clicked item to the clicked
 * item's new state.
 * @param ids the ids of the list, in order
 * @param selected the selected ids before the click
 * @param anchorId the id of the last clicked item, if any
 * @param clickedId the id of the clicked item
 * @param isRange whether shift was held
 */
export function getClickedSelection(
    ids: readonly number[],
    selected: ReadonlySet<number>,
    anchorId: number | null,
    clickedId: number,
    isRange: boolean
) {
    const next = new Set(selected);
    const shouldDeselect = selected.has(clickedId);
    const anchorIndex = anchorId === null ? -1 : ids.indexOf(anchorId);
    const index = ids.indexOf(clickedId);
    const range =
        isRange && anchorIndex !== -1
            ? ids.slice(
                  Math.min(index, anchorIndex),
                  Math.max(index, anchorIndex) + 1
              )
            : [clickedId];
    for (const id of range) {
        if (shouldDeselect) {
            next.delete(id);
        } else {
            next.add(id);
        }
    }
    return next;
}

/**
 * Every id from the first selected one to the last, in list order. A selection of fewer than
 * two has no gap, so it comes back as it is.
 * @param ids the ids of the list, in order
 * @param selected the selected ids
 */
export function selectBetween(
    ids: readonly number[],
    selected: ReadonlySet<number>
) {
    const first = ids.findIndex((id) => selected.has(id));
    const last = ids.findLastIndex((id) => selected.has(id));
    // With nothing selected both are -1 and the slice is empty
    return new Set([...selected, ...ids.slice(first, last + 1)]);
}
