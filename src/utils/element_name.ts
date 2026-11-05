/**
 * The longest name the editors let an element have.
 */
export const MAX_NAME_LENGTH = 40;

/**
 * How much of a name stays before the number, the same as core's cloner keeps.
 */
const MAX_BASE_LENGTH = 37;

/**
 * The name itself when it is free, or else the name with the first free number (`Name-1`),
 * like core's cloner names copies. Two elements with one name look the same in the lists, and
 * other editors tell children apart by name.
 * @param name the wanted name
 * @param isTaken whether a candidate is already used
 */
export function getFreeName(
    name: string,
    isTaken: (candidate: string) => boolean
) {
    if (!isTaken(name)) {
        return name;
    }
    const base = name.slice(0, MAX_BASE_LENGTH);
    let count = 1;
    while (isTaken(`${base}-${count}`)) {
        count++;
    }
    return `${base}-${count}`;
}
