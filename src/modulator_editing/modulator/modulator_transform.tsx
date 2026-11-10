import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { StepperButton } from "../../fancy_inputs/stepper_button/stepper_button.tsx";
import { MinusIcon, PlusIcon } from "../../utils/icons/app_icons.tsx";
import { useLayout } from "../../layout/layout_context.ts";

/**
 * The amount is a signed 16-bit number in SF2.
 */
const MIN_AMOUNT = -32_768;
const MAX_AMOUNT = 32_767;

interface ModulatorTransformProps {
    amount: number;
    transformType: number;
    onAmountChange: (amount: number) => void;
    /**
     * A phone stepper's change, which a burst merges into one undo step.
     */
    onAmountStep: (amount: number) => void;
    onTransformTypeChange: (transformType: 0 | 2) => void;
}

interface AmountSteppersProps {
    amount: number;
    onAmountStep: (amount: number) => void;
    children: ReactNode;
}

/**
 * The phone's − and + around the amount field, by 1 or by 10.
 */
function AmountSteppers({
    amount,
    onAmountStep,
    children
}: AmountSteppersProps) {
    const { t } = useTranslation();
    const [isTimes10, setIsTimes10] = useState(false);
    const step = (direction: 1 | -1, count: number) =>
        onAmountStep(
            Math.min(
                MAX_AMOUNT,
                Math.max(
                    MIN_AMOUNT,
                    amount + direction * count * (isTimes10 ? 10 : 1)
                )
            )
        );
    return (
        <div className={"modulator_amount_steppers"}>
            <StepperButton
                label={t("phoneLocale.modulators.amountDown")}
                steps={1}
                onStep={(count) => step(-1, count)}
            >
                <MinusIcon />
            </StepperButton>
            {children}
            <StepperButton
                label={t("phoneLocale.modulators.amountUp")}
                steps={1}
                onStep={(count) => step(1, count)}
            >
                <PlusIcon />
            </StepperButton>
            <button
                type={"button"}
                className={"pretty_button modulator_amount_times10"}
                aria-pressed={isTimes10}
                onClick={() => setIsTimes10(!isTimes10)}
            >
                {t("phoneLocale.cellSheet.times10")}
            </button>
        </div>
    );
}

/**
 * The amount the modulator is multiplied by, and the transform applied to the result.
 */
export function ModulatorTransform({
    amount,
    transformType,
    onAmountChange,
    onAmountStep,
    onTransformTypeChange
}: ModulatorTransformProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const amountField = (
        <WaitingInput
            type={"text"}
            inputMode={"text"}
            className={"modulator_amount_input monospaced"}
            aria-label={t("modulatorLocale.amount")}
            placeholder={t("modulatorLocale.amount")}
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            value={amount}
            onCommit={(value) => {
                const newAmount = Math.trunc(value);
                onAmountChange(newAmount);
                return newAmount;
            }}
        />
    );
    return (
        <div className={"pretty_input"}>
            <span aria-hidden={true}>×</span>
            {layout === "phone" ? (
                <AmountSteppers amount={amount} onAmountStep={onAmountStep}>
                    {amountField}
                </AmountSteppers>
            ) : (
                amountField
            )}
            <select
                className={"transform_selector monospaced"}
                aria-label={t("modulatorLocale.transform")}
                value={transformType}
                onChange={(e) =>
                    onTransformTypeChange(
                        Number.parseInt(e.target.value) === 2 ? 2 : 0
                    )
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
    );
}
