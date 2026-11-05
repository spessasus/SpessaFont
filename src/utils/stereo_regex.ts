// One stereo suffix: "(R)", "(L)", "R", "L", "_R" or "-L", in either case. Only one letter goes,
// so a name like "Bell L" keeps its "ll"
const STEREO_REGEX = /\s*(?:\([rRlL]\)|[_-]?[rRlL])$/;

/**
 * The name a stereo pair shares: the name without its suffix, when that leaves both halves
 * with the same name. Otherwise the name stays, so "Bell" is not cut to "Bel".
 */
export function getStereoBaseName(name: string, partnerName: string) {
    const base = name.replace(STEREO_REGEX, "");
    // Halves with the same name have no suffix to tell them apart
    return name !== partnerName &&
        base === partnerName.replace(STEREO_REGEX, "")
        ? base.trim()
        : name;
}
