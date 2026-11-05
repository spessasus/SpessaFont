/**
 * Sorts elements by name, comparing UTF-16 code units rather than using locale rules.
 */
export function nameSorter(a: { name: string }, b: { name: string }) {
    if (a.name === b.name) {
        return 0;
    }
    return a.name > b.name ? 1 : -1;
}
