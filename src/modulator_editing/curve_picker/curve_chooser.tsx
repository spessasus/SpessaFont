import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CustomCurveView } from "../../core_backend/entity_views.ts";
import { SegmentedControl } from "../../fancy_inputs/segmented_control/segmented_control.tsx";
import { CustomCurves } from "./custom_curves.tsx";
import { curveKey } from "./curve_shape.ts";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import { StandardCurves } from "./standard_curves.tsx";
import "./curve_chooser.css";

interface CurveChooserProps {
    current: SpessaFontModulatorCurveType;
    customCurves: readonly CustomCurveView[];
    /**
     * The layout's classes of the standard curves' container and of one of its buttons.
     */
    gridClassName: string;
    pickClassName: string;
    onPick: (c: SpessaFontModulatorCurveType) => void;
    onChange: (c: SpessaFontModulatorCurveType) => void;
}

/**
 * SFe mode's curve options: the standard curves or the bank's custom ones. It opens on the kind
 * the source uses.
 */
export function CurveChooser({
    current,
    customCurves,
    gridClassName,
    pickClassName,
    onPick,
    onChange
}: CurveChooserProps) {
    const { t } = useTranslation();
    const [kind, setKind] = useState<"standard" | "custom">(
        current.id === undefined ? "standard" : "custom"
    );
    return (
        <div className="curve_chooser">
            <div className="curve_chooser_kinds">
                <SegmentedControl
                    label={t("modulatorLocale.curves.kind")}
                    options={[
                        {
                            value: "standard",
                            label: t("modulatorLocale.curves.standard")
                        },
                        {
                            value: "custom",
                            label: t("modulatorLocale.curves.custom")
                        }
                    ]}
                    value={kind}
                    onChange={setKind}
                />
            </div>
            {kind === "custom" ? (
                <CustomCurves
                    curves={customCurves}
                    current={current}
                    onPick={onPick}
                    onChange={onChange}
                />
            ) : (
                <div className={gridClassName}>
                    <StandardCurves
                        currentKey={curveKey(current)}
                        pickClassName={pickClassName}
                        onPick={onPick}
                    />
                </div>
            )}
        </div>
    );
}
