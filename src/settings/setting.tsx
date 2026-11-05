import type * as React from "react";

interface SettingProps {
    label: string;
    /**
     * The one control of the row, which the label names.
     */
    children: React.ReactNode;
}

/**
 * One row of the settings.
 */
export function Setting({ label, children }: SettingProps) {
    return (
        <label className={"settings_item"}>
            <span>{label}</span>
            {children}
        </label>
    );
}
