import { type GeneratorType, Modulator } from "spessasynth_core";
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
import * as React from "react";
import { type JSX } from "react";

interface ModulatorProps {
    mod: Modulator;
    setModulator: (m: Modulator) => void;
    deleteModulator: () => void;
    modulatorNumber: number;
    activeModPickerId: string | null;
    setActiveModPickerId: (i: string) => void;
    onClick: (e: React.MouseEvent) => unknown;
    selected: boolean;
    destinationList: JSX.Element;
    ccList: JSX.Element;
    overridingDefaultModulator: boolean;
}

const AMOUNT_PREFIX = "× ";

export const ModulatorView = React.memo(function ({
    mod,
    setModulator,
    deleteModulator,
    modulatorNumber,
    activeModPickerId,
    setActiveModPickerId,
    onClick,
    selected,
    destinationList,
    ccList,
    overridingDefaultModulator
}: ModulatorProps) {
    const { t } = useTranslation();

    function setDestination(dest: GeneratorType) {
        mod.destination = dest;
        setModulator(mod);
    }

    function setAmount(amount: number) {
        mod.transformAmount = amount;
        setModulator(mod);
    }

    function setTransformType(t: number) {
        if (t !== 0 && t !== 2) {
            return;
        }

        mod.transformType = t;
        setModulator(mod);
    }

    function setSource(s: SpessaFontModulatorSource) {
        mod.primarySource.index = s.sourceIndex;
        mod.primarySource.isCC = s.usesCC;
        setModulator(mod);
    }

    function setSecSource(s: SpessaFontModulatorSource) {
        mod.secondarySource.index = s.sourceIndex;
        mod.secondarySource.isCC = s.usesCC;
        setModulator(mod);
    }

    function setCurveType(c: SpessaFontModulatorCurveType) {
        mod.primarySource.curveType = c.curveType;
        mod.primarySource.isBipolar = c.bipolar;
        mod.primarySource.isNegative = !c.positive;
        setModulator(mod);
    }

    function setSecCurveType(c: SpessaFontModulatorCurveType) {
        mod.secondarySource.curveType = c.curveType;
        mod.secondarySource.isBipolar = c.bipolar;
        mod.secondarySource.isNegative = !c.positive;
        setModulator(mod);
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClick(e);
                }
            }}
            className={`modulator_main ${selected ? "selected" : ""}`}
            title={
                overridingDefaultModulator
                    ? t("modulatorLocale.overriding")
                    : ""
            }
        >
            <h4
                className={`modulator_title_left ${overridingDefaultModulator ? "overriding_modulator" : ""}`}
            >
                #{modulatorNumber}
            </h4>
            <h2 className={"modulator_title_right"} onClick={deleteModulator}>
                &times;
            </h2>
            <div className={"source_pair"}>
                <ModulatorSourcePicker
                    ccOptions={ccList}
                    setSource={setSource}
                    source={{
                        usesCC: mod.primarySource.isCC,
                        sourceIndex: mod.primarySource.index
                    }}
                ></ModulatorSourcePicker>
                <ModulatorSourcePicker
                    ccOptions={ccList}
                    setSource={setSecSource}
                    source={{
                        usesCC: mod.secondarySource.isCC,
                        sourceIndex: mod.secondarySource.index
                    }}
                ></ModulatorSourcePicker>
            </div>
            <div className={"source_pair"}>
                <ModulatorCurvePicker
                    id={`${modulatorNumber}-1`}
                    isActive={activeModPickerId === `${modulatorNumber}-1`}
                    setActive={() =>
                        setActiveModPickerId(`${modulatorNumber}-1`)
                    }
                    setNotActive={() => setActiveModPickerId("")}
                    curveType={{
                        curveType: mod.primarySource.curveType,
                        bipolar: mod.primarySource.isBipolar,
                        positive: !mod.primarySource.isNegative
                    }}
                    setCurveType={setCurveType}
                ></ModulatorCurvePicker>
                <ModulatorCurvePicker
                    id={`${modulatorNumber}-2`}
                    isActive={activeModPickerId === `${modulatorNumber}-2`}
                    setNotActive={() => setActiveModPickerId("")}
                    setActive={() =>
                        setActiveModPickerId(`${modulatorNumber}-2`)
                    }
                    curveType={{
                        curveType: mod.secondarySource.curveType,
                        bipolar: mod.secondarySource.isBipolar,
                        positive: !mod.secondarySource.isNegative
                    }}
                    setCurveType={setSecCurveType}
                ></ModulatorCurvePicker>
            </div>
            <ModulatorDiagram></ModulatorDiagram>
            <div className={"pretty_input"}>
                <input
                    type="text"
                    className=" amount_input monospaced"
                    placeholder={`${AMOUNT_PREFIX} ${t("modulatorLocale.amount")}`}
                    value={`${AMOUNT_PREFIX}${mod.transformAmount}`}
                    onChange={(e) => {
                        const rawValue = e.target.value;
                        const numericPart = rawValue
                            .replace(AMOUNT_PREFIX, "")
                            .trim();

                        if (numericPart === "") {
                            setAmount(0);
                            return;
                        }

                        const parsed = parseInt(numericPart, 10);
                        if (
                            !isNaN(parsed) &&
                            parsed >= -32767 &&
                            parsed <= 32767
                        ) {
                            setAmount(parsed);
                        }
                    }}
                />
                <select
                    className={"transform_selector monospaced"}
                    value={mod.transformType}
                    onChange={(e) =>
                        setTransformType(parseInt(e.target.value) || 0)
                    }
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
                destinationList={destinationList}
                destination={mod.destination}
                setDestination={setDestination}
            ></DestinationPicker>
        </div>
    );
});
