import type { ReactNode } from "react";
import { BottomSheet } from "./bottom_sheet.tsx";

interface PropertiesSheetProps {
    title: string;
    onClose: () => void;
    /**
     * The desktop bottom bar to show as a form.
     */
    children: ReactNode;
}

/**
 * The sheet that holds a preset's or instrument's bottom bar, which `bottom_bar_phone.css`
 * re-flows into a form.
 */
export function PropertiesSheet({
    title,
    onClose,
    children
}: PropertiesSheetProps) {
    return (
        <BottomSheet title={title} onClose={onClose}>
            <div className={"properties_sheet_form"}>{children}</div>
        </BottomSheet>
    );
}
