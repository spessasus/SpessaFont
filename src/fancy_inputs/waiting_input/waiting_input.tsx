import * as React from "react";
import { useCallback, useEffect, useState } from "react";

type WaitingInputProps<T extends string | number> = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
> & {
    value: T;
    setValue: (v: T) => T;
    suffix?: string;
};

export function WaitingInput<T extends string | number>({
    value,
    setValue,
    suffix = "",
    max,
    min,
    maxLength,
    ...attributes
}: WaitingInputProps<T>) {
    const [text, setText] = useState(value.toString());

    const isNumber = typeof value === "number";

    const clampNumber = useCallback(
        (val: number): number => {
            const minVal = min === undefined ? -Infinity : Number(min);
            const maxVal = max === undefined ? Infinity : Number(max);
            return Math.min(Math.max(val, minVal), maxVal);
        },
        [max, min]
    );

    const setVal = (v: string) => {
        let parsedValue: T;

        if (isNumber) {
            let num = Number.parseFloat(v);
            if (Number.isNaN(num)) {
                num = 0;
            }
            num = clampNumber(num);
            parsedValue = num as T;
        } else {
            if (maxLength !== undefined) {
                v = v.slice(0, maxLength);
            }
            parsedValue = v as T;
        }

        if (parsedValue.toString() === value.toString()) {
            setText(value.toString());
            return;
        }

        const newValue = setValue(parsedValue);
        setText(newValue.toString());
    };

    useEffect(() => {
        setText(value.toString());
    }, [value]);

    return (
        <input
            {...attributes}
            min={min}
            maxLength={maxLength}
            max={max}
            value={text + suffix}
            onBlur={(e) => {
                const stripped = e.target.value.replaceAll(suffix, "");
                setVal(stripped);
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                }
            }}
            onChange={(e) => {
                const stripped = e.target.value.replaceAll(suffix, "");
                setText(stripped);
            }}
        />
    );
}
