import { Modulator } from "spessasynth_core";
import type * as React from "react";
import "./modulator.css";
import { useTranslation } from "react-i18next";
import {
    ModulatorSourcePicker,
    type SpessaFontModulatorSource
} from "../source_picker/source_picker.tsx";
import {
    ModulatorCurvePicker,
    type SpessaFontModulatorCurveType
} from "../curve_picker/curve_picker.tsx";
import { ModulatorDiagram } from "../diagram.tsx";
import { DestinationPicker } from "../destination_picker.tsx";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";

const MAX_AMOUNT = 32_767;

export type ModulatorSourceSlot = "primary" | "secondary";

interface ModulatorViewProps {
    mod: Modulator;
    modulatorNumber: number;
    isSelected: boolean;
    isOverridingDefault: boolean;
    /**
     * Which curve picker of this modulator is open, if any.
     */
    openCurvePicker: ModulatorSourceSlot | null;
    onOpenCurvePickerChange: (slot: ModulatorSourceSlot | null) => void;
    /**
     * Receives an edited copy. The modulator itself is never changed.
     */
    onChange: (mod: Modulator) => void;
    onDelete: () => void;
    onSelect: (e: React.MouseEvent) => void;
}

export function ModulatorView({
    mod,
    modulatorNumber,
    isSelected,
    isOverridingDefault,
    openCurvePicker,
    onOpenCurvePickerChange,
    onChange,
    onDelete,
    onSelect
}: ModulatorViewProps) {
    const { t } = useTranslation();

    const update = (change: (copy: Modulator) => void) => {
        const copy = Modulator.copyFrom(mod);
        change(copy);
        onChange(copy);
    };

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
            <button
                type={"button"}
                aria-pressed={isSelected}
                className={`plain_button modulator_title_left ${isOverridingDefault ? "overriding_modulator" : ""}`}
                aria-label={t("modulatorLocale.modulatorNumber", {
                    number: modulatorNumber
                })}
                onClick={onSelect}
            >
                #{modulatorNumber}
            </button>
            <button
                type={"button"}
                className={"plain_button modulator_title_right"}
                aria-label={t("modulatorLocale.deleteModulator", {
                    number: modulatorNumber
                })}
                title={t("modulatorLocale.deleteModulator", {
                    number: modulatorNumber
                })}
                onClick={onDelete}
            >
                &times;
            </button>
            <div className={"source_pair"}>
                {sources.map(({ slot, source, sourceLabel }) => (
                    <ModulatorSourcePicker
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
                    <ModulatorCurvePicker
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
            <ModulatorDiagram />
            <div className={"pretty_input"}>
                <span aria-hidden={true}>×</span>
                <WaitingInput
                    type={"text"}
                    className={"amount_input monospaced"}
                    aria-label={t("modulatorLocale.amount")}
                    placeholder={t("modulatorLocale.amount")}
                    min={-MAX_AMOUNT}
                    max={MAX_AMOUNT}
                    value={mod.transformAmount}
                    setValue={(amount) => {
                        const transformAmount = Math.trunc(amount);
                        update((copy) => {
                            copy.transformAmount = transformAmount;
                        });
                        return transformAmount;
                    }}
                />
                <select
                    className={"transform_selector monospaced"}
                    aria-label={t("modulatorLocale.transform")}
                    value={mod.transformType}
                    onChange={(e) => {
                        const transformType =
                            Number.parseInt(e.target.value) === 2 ? 2 : 0;
                        update((copy) => {
                            copy.transformType = transformType;
                        });
                    }}
                >
                    <option value={0}>
                        {t("modulatorLocale.transforms.noOperation")}
                    </option>
                    <option value={2}>
                        {t("modulatorLocale.transforms.absoluteValue")}
                    </option>
                </select>
            </div>

            <DestinationPicker
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
