import { useTranslation } from "react-i18next";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";

/**
 * The amount is a signed 16-bit number in SF2.
 */
const MIN_AMOUNT = -32_768;
const MAX_AMOUNT = 32_767;

interface ModulatorTransformProps {
    amount: number;
    transformType: number;
    onAmountChange: (amount: number) => void;
    onTransformTypeChange: (transformType: 0 | 2) => void;
}

/**
 * The amount the modulator is multiplied by, and the transform applied to the result.
 */
export function ModulatorTransform({
    amount,
    transformType,
    onAmountChange,
    onTransformTypeChange
}: ModulatorTransformProps) {
    const { t } = useTranslation();
    return (
        <div className={"pretty_input"}>
            <span aria-hidden={true}>×</span>
            <WaitingInput
                type={"text"}
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
