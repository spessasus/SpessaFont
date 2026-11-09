import { useTranslation } from "react-i18next";
import { SamplePlayback } from "./sample_playback.tsx";
import type { SamplePlayerState } from "./use_sample_player.ts";
import { StepperButton } from "../fancy_inputs/stepper_button/stepper_button.tsx";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";

/**
 * The steps on each side of a loop point's field, with their text and the amount the label
 * names (with a real minus sign, which screen readers say as "minus").
 */
const LOWER_STEPS = [
    { steps: -100, text: "-100", amount: "−100" },
    { steps: -1, text: "-1", amount: "−1" }
] as const;
const UPPER_STEPS = [
    { steps: 1, text: "+1", amount: "+1" },
    { steps: 100, text: "+100", amount: "+100" }
] as const;

interface LoopStepperProps {
    point: string;
    steps: number;
    text: string;
    amount: string;
    onStep: (by: number) => void;
}

function LoopStepper({ point, steps, text, amount, onStep }: LoopStepperProps) {
    const { t } = useTranslation();
    return (
        <StepperButton
            label={t("phoneLocale.sample.moveLoopPoint", { point, amount })}
            steps={steps}
            onStep={onStep}
        >
            {text}
        </StepperButton>
    );
}

interface LoopPointRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => number;
    onStep: (by: number) => void;
}

function LoopPointRow({
    label,
    value,
    min,
    max,
    onChange,
    onStep
}: LoopPointRowProps) {
    return (
        <div className={"loop_section_point"}>
            <span className={"loop_section_label"}>{label}</span>
            <div className={"loop_section_stepper_row"}>
                {LOWER_STEPS.map((step) => (
                    <LoopStepper
                        key={step.steps}
                        point={label}
                        onStep={onStep}
                        {...step}
                    />
                ))}
                <WaitingInput
                    onCommit={onChange}
                    value={value}
                    className={"pretty_input monospaced"}
                    type={"text"}
                    inputMode={"numeric"}
                    min={min}
                    max={max}
                    aria-label={label}
                />
                {UPPER_STEPS.map((step) => (
                    <LoopStepper
                        key={step.steps}
                        point={label}
                        onStep={onStep}
                        {...step}
                    />
                ))}
            </div>
        </div>
    );
}

interface LoopSectionProps {
    loopStart: number;
    loopEnd: number;
    length: number;
    playerState: SamplePlayerState;
    onPlay: (isLooped: boolean) => void;
    onStop: () => void;
    onLoopStartChange: (loopStart: number) => number;
    onLoopEndChange: (loopEnd: number) => number;
    onStepLoopStart: (by: number) => void;
    onStepLoopEnd: (by: number) => void;
    isLoading: boolean;
    onAutoLoop: () => void;
    onTrimAfterLoop: () => void;
}

/**
 * The phone sample editor's Loop section: playback, the loop points with steppers in place of
 * dragging on the wave, and the loop tools.
 */
export function LoopSection({
    loopStart,
    loopEnd,
    length,
    playerState,
    onPlay,
    onStop,
    onLoopStartChange,
    onLoopEndChange,
    onStepLoopStart,
    onStepLoopEnd,
    isLoading,
    onAutoLoop,
    onTrimAfterLoop
}: LoopSectionProps) {
    const { t } = useTranslation();
    return (
        <div className={"loop_section"}>
            <SamplePlayback
                state={playerState}
                onPlay={onPlay}
                onStop={onStop}
            />
            <LoopPointRow
                label={t("sampleLocale.loopStart")}
                value={loopStart}
                min={0}
                max={loopEnd}
                onChange={onLoopStartChange}
                onStep={onStepLoopStart}
            />
            <LoopPointRow
                label={t("sampleLocale.loopEnd")}
                value={loopEnd}
                min={loopStart}
                max={length}
                onChange={onLoopEndChange}
                onStep={onStepLoopEnd}
            />
            <div className={"loop_section_tools"}>
                <button
                    type={"button"}
                    className={"pretty_button responsive_button"}
                    aria-disabled={isLoading}
                    onClick={() => {
                        if (!isLoading) {
                            onAutoLoop();
                        }
                    }}
                >
                    {t("sampleLocale.tools.autoLoop")}
                </button>
                <button
                    type={"button"}
                    className={"pretty_button responsive_button"}
                    aria-disabled={isLoading}
                    onClick={() => {
                        if (!isLoading) {
                            onTrimAfterLoop();
                        }
                    }}
                >
                    {t("toolsLocale.trim.trimAfterLoop")}
                </button>
            </div>
        </div>
    );
}
