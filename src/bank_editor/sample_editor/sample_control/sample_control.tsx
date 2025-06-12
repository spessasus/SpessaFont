import "./sample_control.css";
import * as React from "react";
import { useEffect, useState } from "react";

type SampleControlsProps = React.InputHTMLAttributes<HTMLInputElement> & {
    value: number;
    setValue: (v: number) => number;
    name: string;
};

export function SampleControl({
    value,
    setValue,
    name,
    ...attributes
}: SampleControlsProps) {
    const [text, setText] = useState(value.toString());
    const setVal = (v: number) => {
        setText(setValue(v).toString());
    };
    useEffect(() => {
        setText(value.toString());
    }, [value]);

    return (
        <div className={"info_field"}>
            <span>{name}</span>
            <input
                {...attributes}
                value={text}
                onBlur={(e) => setVal(parseInt(e.target.value) || 0)}
                onChange={(e) => setText(e.target.value)}
            />
        </div>
    );
}
