const ids = new WeakMap<object, number>();
const counter = { next: 1 };

/**
 * Returns a stable numeric id for an object, for use as a React key.
 * Core objects have no id of their own, and names or indexes are not unique or stable.
 */
export function getObjectId(object: object) {
    let id = ids.get(object);
    if (id === undefined) {
        id = counter.next++;
        ids.set(object, id);
    }
    return id;
}

/**
 * Gives an edited copy the id of the object it replaces in a list,
 * so React keeps the row mounted (and focused) across the edit.
 */
export function shareObjectId(original: object, copy: object) {
    ids.set(copy, getObjectId(original));
}
