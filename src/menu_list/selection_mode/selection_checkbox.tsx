import "./selection_mode.css";
import type { MouseEvent } from "react";

interface SelectionCheckboxProps {
    isChecked: boolean;
    /**
     * The row's click, so a tap on the box toggles the row like a tap on its name.
     */
    onClick: (event: MouseEvent) => void;
}

/**
 * The box in front of a list row in selection mode. The row already says whether it is
 * selected, so the box is hidden from assistive technology and the keyboard.
 */
export function SelectionCheckbox({
    isChecked,
    onClick
}: SelectionCheckboxProps) {
    return (
        <input
            type={"checkbox"}
            className={"selection_checkbox"}
            aria-hidden={true}
            tabIndex={-1}
            checked={isChecked}
            readOnly={true}
            onClick={onClick}
        />
    );
}
