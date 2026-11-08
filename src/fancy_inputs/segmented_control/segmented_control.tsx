import { useRef } from "react";
import type { KeyboardEvent } from "react";
import "./segmented_control.css";

interface SegmentedControlProps<T extends string> {
    label: string;
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    isDisabled?: boolean;
}

/**
 * A radio group drawn as joined segments, with one Tab stop and arrow keys that wrap.
 */
export function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    isDisabled = false
}: SegmentedControlProps<T>) {
    const buttons = useRef(new Array<HTMLButtonElement | null>());
    const checkedIndex = options.findIndex((o) => o.value === value);
    // With no match, the first segment keeps the Tab stop
    const stopIndex = Math.max(checkedIndex, 0);

    const handleKeyDown = (event: KeyboardEvent, index: number) => {
        let step = 0;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            step = 1;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            step = -1;
        }
        if (step === 0) {
            return;
        }
        event.preventDefault();
        if (isDisabled) {
            return;
        }
        const next = (index + step + options.length) % options.length;
        onChange(options[next].value);
        buttons.current[next]?.focus();
    };

    return (
        <div aria-label={label} className="segmented_control" role="radiogroup">
            {options.map((option, index) => (
                <button
                    aria-checked={option.value === value}
                    aria-disabled={isDisabled}
                    className="segmented_control_segment"
                    key={option.value}
                    onClick={() => {
                        if (!isDisabled) {
                            onChange(option.value);
                        }
                    }}
                    onKeyDown={(event) => {
                        handleKeyDown(event, index);
                    }}
                    ref={(element) => {
                        buttons.current[index] = element;
                    }}
                    role="radio"
                    tabIndex={index === stopIndex ? 0 : -1}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
