import * as React from "react";
import { useEffect, useState } from "react";

type WaitingInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    value: number;
    setValue: (v: number) => number;
    suffix?: string;
};

// a numeric input that waits for the user to finish typing before it sends a value
export function WaitingInput({
    value,
    setValue,
    suffix = "",
    ...attributes
}: WaitingInputProps) {
    const [text, setText] = useState(value.toString());
    const setVal = (v: number) => {
        setText(setValue(v).toString());
    };
    useEffect(() => {
        setText(value.toString());
    }, [value]);

    return (
        <input
            {...attributes}
            value={text + suffix}
            onBlur={(e) =>
                setVal(parseInt(e.target.value.replaceAll(suffix, "")) || 0)
            }
            onChange={(e) => setText(e.target.value.replaceAll(suffix, ""))}
        />
    );
}
