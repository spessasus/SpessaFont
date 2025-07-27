import "./sample_display.css";
import * as React from "react";
import { useRef } from "react";
import { BasicSample } from "spessasynth_core";
import { SpeakerIcon } from "../../utils/icons.tsx";

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
            title={sample.name}
        >
            <SpeakerIcon />
            <span className={"monospaced"}>{sample.name}</span>
        </div>
    );
});
