import { type generatorTypes, Modulator } from "spessasynth_core";
import "./modulator.css";
import { useTranslation } from "react-i18next";
import {
    type ModulatorSource,
    ModulatorSourcePicker
} from "../source_picker/source_picker.tsx";
import {
    ModulatorCurvePicker,
    type ModulatorCurveType
} from "../curve_picker/curve_picker.tsx";
import { ModulatorDiagram } from "../diagram.tsx";
import { DestinationPicker } from "../destination_picker.tsx";
import * as React from "react";
import { type JSX } from "react";

type ModulatorProps = {
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
};

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

    function setDestination(dest: generatorTypes) {
        mod.modulatorDestination = dest;
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

    function setSource(s: ModulatorSource) {
        mod.sourceIndex = s.sourceIndex;
        mod.sourceUsesCC = s.usesCC ? 1 : 0;
        setModulator(mod);
    }

    function setSecSource(s: ModulatorSource) {
        mod.secSrcIndex = s.sourceIndex;
        mod.secSrcUsesCC = s.usesCC ? 1 : 0;
        setModulator(mod);
    }

    function setCurveType(c: ModulatorCurveType) {
        mod.sourceCurveType = c.curveType;
        mod.sourcePolarity = c.bipolar ? 1 : 0;
        mod.sourceDirection = c.positive ? 0 : 1;
        setModulator(mod);
    }

    function setSecCurveType(c: ModulatorCurveType) {
        mod.secSrcCurveType = c.curveType;
        mod.secSrcPolarity = c.bipolar ? 1 : 0;
        mod.secSrcDirection = c.positive ? 0 : 1;
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
                        usesCC: mod.sourceUsesCC > 0,
                        sourceIndex: mod.sourceIndex
                    }}
                ></ModulatorSourcePicker>
                <ModulatorSourcePicker
                    ccOptions={ccList}
                    setSource={setSecSource}
                    source={{
                        usesCC: mod.secSrcUsesCC > 0,
                        sourceIndex: mod.secSrcIndex
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
                        curveType: mod.sourceCurveType,
                        bipolar: mod.sourcePolarity === 1,
                        positive: mod.sourceDirection === 0
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
                        curveType: mod.secSrcCurveType,
                        bipolar: mod.secSrcPolarity === 1,
                        positive: mod.secSrcDirection === 0
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
                            parsed >= -12700 &&
                            parsed <= 12700
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
                destination={mod.modulatorDestination}
                setDestination={setDestination}
            ></DestinationPicker>
        </div>
    );
});
