import * as React from "react";
import { useEffect, useState } from "react";
import { typedMemo } from "../../utils/typed_memo.ts";

export const GeneratorCellInput = typedMemo(function ({
    onBlur,
    value,
    regex,
    ...attributes
}: {
    value: string;
    regex: RegExp;
    onBlur: (t: string) => string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onBlur">) {
    const [typedText, setTypedText] = useState(value);
    const [clearOnType, setClearOnType] = useState(true);
    useEffect(() => {
        setTypedText(value);
        setClearOnType(true);
    }, [value]);

    return (
        <input
            {...attributes}
            value={typedText}
            onBlur={() => setTypedText(onBlur(typedText))}
            onFocus={() => setClearOnType(true)}
            onKeyDown={(e) => {
                switch (e.key) {
                    default:
                        break;
                    case "Backspace":
                    case "Delete":
                        setTypedText("");
                        break;

                    case "Enter":
                        (e.target as HTMLInputElement).blur();
                }
            }}
            onChange={(e) => {
                let text = e.target.value;
                if (clearOnType && text.length > 0) {
                    text = text[0];
                    setClearOnType(false);
                }
                text = text.replace(regex, "");
                setTypedText(text);
            }}
        />
    );
});
