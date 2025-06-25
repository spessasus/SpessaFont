import * as React from "react";
import { useEffect, useState } from "react";

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
    ...attributes
}: WaitingInputProps<T>) {
    const [text, setText] = useState(value.toString());

    const setVal = (v: string) => {
        let parsedValue: T;
        if (typeof value === "number") {
            parsedValue = (parseFloat(v) as T) || (0 as T);
        } else {
            parsedValue = v as T;
        }
        if (parsedValue.toString() === value.toString()) {
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
            value={text + suffix}
            onBlur={(e) => {
                const stripped = e.target.value.replaceAll(suffix, "");
                setVal(stripped);
            }}
            onChange={(e) => {
                const stripped = e.target.value.replaceAll(suffix, "");
                setText(stripped);
            }}
        />
    );
}
