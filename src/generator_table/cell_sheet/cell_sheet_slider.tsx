import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { clamp } from "../generator_range.ts";
import { formatNumberCell } from "../cell/cell_values.ts";
import { GENERATOR_UNITS } from "../generator_unit.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";

interface CellSheetSliderProps {
    row: GeneratorRowType;
    /**
     * The generator's range, in generator units.
     */
    range: { min: number; max: number };
    /**
     * What the first checked cell plays, raw. Null when nothing is checked.
     */
    value: number | null;
    isDisabled: boolean;
    /**
     * The dragged raw value, or null when the drag ends.
     */
    onDraftChange: (draft: number | null) => void;
    /**
     * Sets the raw value in every checked cell, as one undo step.
     */
    onCommit: (value: number) => void;
}

/**
 * A slider over the generator's raw range. Dragging only shows the value, the release sets
 * it in the checked cells, and a canceled drag or a closed sheet changes nothing.
 */
export function CellSheetSlider({
    row,
    range,
    value,
    isDisabled,
    onDraftChange,
    onCommit
}: CellSheetSliderProps) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<number | null>(null);
    const shown = draft ?? value ?? clamp(0, range.min, range.max);
    const unit = row.unit ? GENERATOR_UNITS[row.unit] : undefined;
    const text = formatNumberCell(row, shown);

    const endDraft = () => {
        setDraft(null);
        onDraftChange(null);
    };

    return (
        <div className={"cell_sheet_slider"}>
            <ControllerRange
                min={range.min}
                max={range.max}
                step={1}
                value={shown}
                text={unit ? `${text} ${t(unit.suffix)}` : text}
                ariaLabel={t("phoneLocale.cellSheet.slider")}
                isDisabled={isDisabled}
                onChange={(next) => {
                    setDraft(next);
                    onDraftChange(next);
                }}
                onCommit={(next) => {
                    // A tap that moved nothing sets nothing, unset cells keep inheriting
                    if (draft === null) {
                        return;
                    }
                    endDraft();
                    onCommit(next);
                }}
                onCancel={endDraft}
            />
        </div>
    );
}
