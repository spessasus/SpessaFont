const ZONE_COLOR_COUNT = 4;

/**
 * The number (1 to 4) of the theme color a zone column uses, cycling through the four zone colors.
 */
export function getZoneColorNumber(index: number) {
    return (index % ZONE_COLOR_COUNT) + 1;
}

/**
 * The theme color a zone column's header bar uses.
 */
export function getZoneColorVariable(index: number) {
    return `var(--zone-color-${getZoneColorNumber(index)})`;
}
