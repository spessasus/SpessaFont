const ZONE_COLOR_COUNT = 4;

/**
 * The theme color a zone column's header bar uses, cycling through the four zone colors.
 */
export function getZoneColorVariable(index: number) {
    return `var(--zone-color-${(index % ZONE_COLOR_COUNT) + 1})`;
}
