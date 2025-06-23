import "./sample_display.css";
import * as React from "react";
import { useRef } from "react";
import { BasicSample } from "spessasynth_core";

export const SampleDisplay = React.memo(function ({
    sample,
    onClick,
    selected
}: {
    sample: BasicSample;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    selected: boolean;
}) {
    const elementRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={elementRef}
            className={`sample_display  ${selected ? "selected" : ""}`}
            onClick={onClick}
            title={sample.sampleName}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-volume-down-fill"
                viewBox="0 0 16 16"
            >
                <path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8" />
            </svg>
            <span className={"monospaced"}>{sample.sampleName}</span>
        </div>
    );
});
