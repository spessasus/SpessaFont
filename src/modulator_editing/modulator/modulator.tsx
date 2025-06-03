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

type ModulatorProps = {
    modulator: Modulator;
    setModulator: (m: Modulator) => void;
    deleteModulator: () => void;
    modulatorNumber: number;
    activeModPickerId: string | null;
    setActiveModPickerId: (i: string) => void;
    setSelected: (s: boolean) => void;
    selected: boolean;
};

const AMOUNT_PREFIX = "× ";

export function ModulatorView({
    modulator,
    setModulator,
    deleteModulator,
    modulatorNumber,
    activeModPickerId,
    setActiveModPickerId,
    setSelected,
    selected
}: ModulatorProps) {
    const { t } = useTranslation();

    function setDestination(dest: generatorTypes) {
        modulator.modulatorDestination = dest;
        setModulator(modulator);
    }

    function setAmount(amount: number) {
        modulator.transformAmount = amount;
        setModulator(modulator);
    }

    function setTransformType(t: number) {
        if (t !== 0 && t !== 2) {
            return;
        }
        modulator.transformType = t;
        setModulator(modulator);
    }

    function setSource(s: ModulatorSource) {
        modulator.sourceIndex = s.sourceIndex;
        modulator.sourceUsesCC = s.usesCC ? 1 : 0;
        setModulator(modulator);
    }

    function setSecSource(s: ModulatorSource) {
        modulator.secSrcIndex = s.sourceIndex;
        modulator.secSrcUsesCC = s.usesCC ? 1 : 0;
        setModulator(modulator);
    }

    function setCurveType(c: ModulatorCurveType) {
        const mod = Modulator.copy(modulator);
        mod.sourceCurveType = c.curveType;
        mod.sourcePolarity = c.bipolar ? 1 : 0;
        mod.sourceDirection = c.positive ? 0 : 1;
        setModulator(mod);
    }

    function setSecCurveType(c: ModulatorCurveType) {
        const mod = Modulator.copy(modulator);
        mod.secSrcCurveType = c.curveType;
        mod.secSrcPolarity = c.bipolar ? 1 : 0;
        mod.secSrcDirection = c.positive ? 0 : 1;
        setModulator(mod);
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setSelected(!selected);
                }
            }}
            className={`modulator_main ${selected ? "selected" : ""}`}
        >
            <div className={"modulator_title"}>
                <h3>
                    {t("modulatorLocale.modulator")} #{modulatorNumber}
                </h3>
                <span
                    className={
                        "pretty_outline responsive_button hover_brightness"
                    }
                    onClick={deleteModulator}
                >
                    {t("modulatorLocale.delete")}
                </span>
            </div>
            <div className={"source_pair"}>
                <ModulatorSourcePicker
                    setSource={setSource}
                    source={{
                        usesCC: modulator.sourceUsesCC > 0,
                        sourceIndex: modulator.sourceIndex
                    }}
                ></ModulatorSourcePicker>
                <ModulatorSourcePicker
                    setSource={setSecSource}
                    source={{
                        usesCC: modulator.secSrcUsesCC > 0,
                        sourceIndex: modulator.secSrcIndex
                    }}
                ></ModulatorSourcePicker>
            </div>
            <div className={"transform_box"}>
                <div className={"source_pair"}>
                    <ModulatorCurvePicker
                        id={`${modulatorNumber}-1`}
                        isActive={activeModPickerId === `${modulatorNumber}-1`}
                        setActive={() =>
                            setActiveModPickerId(`${modulatorNumber}-1`)
                        }
                        setNotActive={() => setActiveModPickerId("")}
                        curveType={{
                            curveType: modulator.sourceCurveType,
                            bipolar: modulator.sourcePolarity === 1,
                            positive: modulator.sourceDirection === 0
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
                            curveType: modulator.secSrcCurveType,
                            bipolar: modulator.secSrcPolarity === 1,
                            positive: modulator.secSrcDirection === 0
                        }}
                        setCurveType={setSecCurveType}
                    ></ModulatorCurvePicker>
                </div>
                <ModulatorDiagram></ModulatorDiagram>
                <input
                    type="text"
                    className="pretty_input amount_input"
                    placeholder={`${AMOUNT_PREFIX} ${t("modulatorLocale.amount")}`}
                    value={`${AMOUNT_PREFIX}${modulator.transformAmount}`}
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
                    className={"pretty_outline transform_selector"}
                    value={modulator.transformType}
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
                destination={modulator.modulatorDestination}
                setDestination={setDestination}
            ></DestinationPicker>
        </div>
    );
}
