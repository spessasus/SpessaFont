export const LAYOUT_SETTINGS = {
    auto: "auto",
    phone: "phone",
    desktop: "desktop"
} as const;
export type LayoutSetting =
    (typeof LAYOUT_SETTINGS)[keyof typeof LAYOUT_SETTINGS];
export type LayoutMode = "desktop" | "phone";

/**
 * Touch screens whose short side is under 600px. The short side does not change on
 * rotation, so rotating never flips the layout.
 */
export const PHONE_LAYOUT_QUERY =
    "(pointer: coarse) and (width < 600px), (pointer: coarse) and (height < 600px)";

export function isLayoutSetting(value: unknown): value is LayoutSetting {
    return (Object.values(LAYOUT_SETTINGS) as unknown[]).includes(value);
}

export function resolveLayout(
    setting: LayoutSetting,
    doesMatchPhoneQuery: boolean
): LayoutMode {
    if (setting === LAYOUT_SETTINGS.auto) {
        return doesMatchPhoneQuery ? "phone" : "desktop";
    }
    return setting;
}
