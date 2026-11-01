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
