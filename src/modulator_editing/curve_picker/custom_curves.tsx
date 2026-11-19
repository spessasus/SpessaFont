import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulatorCurveTypes } from "spessasynth_core";
import type { CustomCurveView } from "../../core_backend/entity_views.ts";
import { CurvePicture } from "./curve_picture.tsx";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import "./custom_curves.css";
import "./custom_curves_phone.css";

interface CustomCurvesProps {
    /**
     * The bank's custom curves.
     */
    curves: readonly CustomCurveView[];
    current: SpessaFontModulatorCurveType;
    /**
     * A picked curve, which closes the picker.
     */
    onPick: (c: SpessaFontModulatorCurveType) => void;
    /**
     * A change to the current custom curve that keeps the picker open.
     */
    onChange: (c: SpessaFontModulatorCurveType) => void;
}

/**
 * The bank's custom curves as a list with a search by name. The polarity and the direction are
 * switches, as they apply to any custom curve.
 */
export function CustomCurves({
    curves,
    current,
    onPick,
    onChange
}: CustomCurvesProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    // Until a custom curve is picked, the switches only say how the pictures are drawn and
    // what a pick sets. They start from the source, as the picker mounts each time it opens
    const [pending, setPending] = useState({
        bipolar: current.bipolar,
        positive: current.positive
    });
    const isCustom = current.id !== undefined;
    const { bipolar, positive } = isCustom ? current : pending;

    const setShape = (shape: { bipolar: boolean; positive: boolean }) => {
        if (isCustom) {
            onChange({ ...current, ...shape });
        } else {
            setPending(shape);
        }
    };

    const typed = query.trim().toLowerCase();
    const matches = curves.filter((c) => c.name.toLowerCase().includes(typed));

    return (
        <div className="custom_curves">
            <div className="custom_curves_controls">
                <input
                    className="pretty_input custom_curves_search"
                    type="search"
                    placeholder={t("modulatorLocale.curves.search")}
                    aria-label={t("modulatorLocale.curves.search")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <label className="custom_curves_switch">
                    <input
                        type="checkbox"
                        checked={bipolar}
                        onChange={(e) =>
                            setShape({ bipolar: e.target.checked, positive })
                        }
                    />
                    <span>{t("modulatorLocale.curves.bipolarSwitch")}</span>
                </label>
                <label className="custom_curves_switch">
                    <input
                        type="checkbox"
                        checked={!positive}
                        onChange={(e) =>
                            setShape({ bipolar, positive: !e.target.checked })
                        }
                    />
                    <span>{t("modulatorLocale.curves.negativeSwitch")}</span>
                </label>
            </div>
            {matches.length > 0 ? (
                <ul className="custom_curves_list">
                    {matches.map((c) => {
                        const curve = {
                            curveType: ModulatorCurveTypes.custom,
                            bipolar,
                            positive,
                            points: c.points,
                            name: c.name,
                            id: c.id
                        };
                        const isCurrent = c.id === current.id;
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    aria-pressed={isCurrent}
                                    className={`plain_button pretty_outline responsive_button custom_curves_pick ${isCurrent ? "selected" : ""}`}
                                    onClick={() => onPick(curve)}
                                >
                                    <CurvePicture curve={curve} />
                                    <span className="custom_curves_name">
                                        {c.name ||
                                            t("modulatorLocale.curves.unnamed")}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="custom_curves_empty">
                    {curves.length > 0
                        ? t("modulatorLocale.curves.noMatches")
                        : t("modulatorLocale.curves.noCurves")}
                </p>
            )}
        </div>
    );
}
