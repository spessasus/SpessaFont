import type { Modulator } from "spessasynth_core";
import type { ModulatorView as ModulatorData } from "../../core_backend/entity_views.ts";
import type * as React from "react";
import type { Ref } from "react";
import "./modulator.css";
import "./modulator_phone.css";
import { useTranslation } from "react-i18next";
import {
    SourcePicker,
    type SpessaFontModulatorSource
} from "../source_picker/source_picker.tsx";
import { CurvePicker } from "../curve_picker/curve_picker.tsx";
import type { SpessaFontModulatorCurveType } from "../curve_picker/curve_shape.ts";
import { ModulatorDiagram } from "../modulator_diagram.tsx";
import { DestinationPicker } from "../destination_picker.tsx";
import { ModulatorHeader } from "./modulator_header.tsx";
import { ModulatorTransform } from "./modulator_transform.tsx";
import { useLayout } from "../../layout/layout_context.ts";

export type ModulatorSourceSlot = "primary" | "secondary";

interface ModulatorCardProps {
    /**
     * The number button of the modulator, which the list focuses after a delete.
     */
    ref?: Ref<HTMLButtonElement>;
    mod: ModulatorData;
    modulatorNumber: number;
    isSelected: boolean;
    isOverridingDefault: boolean;
    /**
     * SF2 mode offers no SFE destinations.
     */
    isSFE: boolean;
    /**
     * Which curve picker of this modulator is open, if any.
     */
    openCurvePicker: ModulatorSourceSlot | null;
    onOpenCurvePickerChange: (slot: ModulatorSourceSlot | null) => void;
    /**
     * Receives the change, which the list applies to a copy of the modulator. The modulator
     * itself is never changed. A change with a merge key makes one undo step with the previous
     * change of the same key.
     */
    onChange: (change: (copy: Modulator) => void, mergeKey?: string) => void;
    onDelete: () => void;
    onSelect: (e: React.MouseEvent) => void;
}

interface ModulatorFieldLabelsProps {
    isOverridingDefault: boolean;
}

/**
 * The visible labels of the phone form, whose controls carry their own accessible names.
 */
function ModulatorFieldLabels({
    isOverridingDefault
}: ModulatorFieldLabelsProps) {
    const { t } = useTranslation();
    return (
        <>
            <span
                aria-hidden={true}
                className="modulator_field_label modulator_label_source"
            >
                {t("modulatorLocale.primarySource")}
            </span>
            <span
                aria-hidden={true}
                className="modulator_field_label modulator_label_secondary"
            >
                {t("modulatorLocale.secondarySource")}
            </span>
            <span
                aria-hidden={true}
                className="modulator_field_label modulator_label_amount"
            >
                {t("modulatorLocale.amount")}
            </span>
            <span
                aria-hidden={true}
                className="modulator_field_label modulator_label_transform"
            >
                {t("modulatorLocale.transform")}
            </span>
            <span
                aria-hidden={true}
                className="modulator_field_label modulator_label_destination"
            >
                {t("modulatorLocale.destination")}
            </span>
            {isOverridingDefault ? (
                <span className="modulator_overrides_note">
                    {t("phoneLocale.modulators.overrides")}
                </span>
            ) : null}
        </>
    );
}

export function ModulatorCard({
    ref,
    mod,
    modulatorNumber,
    isSelected,
    isOverridingDefault,
    isSFE,
    openCurvePicker,
    onOpenCurvePickerChange,
    onChange,
    onDelete,
    onSelect
}: ModulatorCardProps) {
    const { t } = useTranslation();
    const layout = useLayout();

    const update = onChange;

    const getSourceSetter =
        (slot: ModulatorSourceSlot) => (s: SpessaFontModulatorSource) =>
            update((copy) => {
                const source =
                    slot === "primary"
                        ? copy.primarySource
                        : copy.secondarySource;
                source.index = s.sourceIndex;
                source.isCC = s.usesCC;
            });

    const getCurveSetter =
        (slot: ModulatorSourceSlot) => (c: SpessaFontModulatorCurveType) =>
            update((copy) => {
                const source =
                    slot === "primary"
                        ? copy.primarySource
                        : copy.secondarySource;
                source.curveType = c.curveType;
                source.isBipolar = c.bipolar;
                source.isNegative = !c.positive;
            });

    const sources = [
        {
            slot: "primary",
            source: mod.primarySource,
            sourceLabel: t("modulatorLocale.primarySource"),
            curveLabel: t("modulatorLocale.primaryCurve")
        },
        {
            slot: "secondary",
            source: mod.secondarySource,
            sourceLabel: t("modulatorLocale.secondarySource"),
            curveLabel: t("modulatorLocale.secondaryCurve")
        }
    ] as const;

    return (
        <div
            // Clicking the empty area of the card selects it, like the number button does
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onSelect(e);
                }
            }}
            className={`modulator_main ${isSelected ? "selected" : ""}`}
            title={isOverridingDefault ? t("modulatorLocale.overriding") : ""}
        >
            <ModulatorHeader
                ref={ref}
                modulatorNumber={modulatorNumber}
                isSelected={isSelected}
                isOverridingDefault={isOverridingDefault}
                onSelect={onSelect}
                onDelete={onDelete}
            />
            {layout === "phone" ? (
                <ModulatorFieldLabels
                    isOverridingDefault={isOverridingDefault}
                />
            ) : null}
            <div className={"source_pair"}>
                {sources.map(({ slot, source, sourceLabel }) => (
                    <SourcePicker
                        key={slot}
                        label={sourceLabel}
                        onChange={getSourceSetter(slot)}
                        source={{
                            usesCC: source.isCC,
                            sourceIndex: source.index
                        }}
                    />
                ))}
            </div>
            <div className={"source_pair"}>
                {sources.map(({ slot, source, curveLabel }) => (
                    <CurvePicker
                        key={slot}
                        label={curveLabel}
                        isOpen={openCurvePicker === slot}
                        onOpenChange={(isOpen) =>
                            onOpenCurvePickerChange(isOpen ? slot : null)
                        }
                        curveType={{
                            curveType: source.curveType,
                            bipolar: source.isBipolar,
                            positive: !source.isNegative
                        }}
                        onChange={getCurveSetter(slot)}
                    />
                ))}
            </div>
            {/* On phones the grid puts it at the header's end, beside the delete button */}
            <ModulatorDiagram />
            <ModulatorTransform
                amount={mod.transformAmount}
                transformType={mod.transformType}
                onAmountChange={(amount) =>
                    update((copy) => {
                        copy.transformAmount = amount;
                    })
                }
                onAmountStep={(amount) =>
                    update((copy) => {
                        copy.transformAmount = amount;
                    }, `modulator amount ${mod.id}`)
                }
                onTransformTypeChange={(transformType) =>
                    update((copy) => {
                        copy.transformType = transformType;
                    })
                }
            />

            <DestinationPicker
                isSFE={isSFE}
                destination={mod.destination}
                onChange={(destination) =>
                    update((copy) => {
                        copy.destination = destination;
                    })
                }
            />
        </div>
    );
}
