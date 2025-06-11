import "./instrument_display.css";
import type { BasicInstrument, BasicSample } from "spessasynth_core";
import { useState } from "react";
import { SampleDisplay } from "../sample_display/sample_display.tsx";

export function InstrumentDisplay({
    instrument,
    selectSample,
    onClick
}: {
    instrument: BasicInstrument;
    selectSample: (s: BasicSample) => unknown;
    onClick: () => unknown;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className={"instrument_item_wrapper"}>
            <div className={"instrument_item"}>
                <span className={"triangle"} onClick={() => setOpen(!open)}>
                    {open ? "\u25BC" : "\u25B6"}
                </span>
                <span
                    className={"monospaced instrument_item_name"}
                    onClick={onClick}
                >
                    {instrument.instrumentName}
                </span>
            </div>
            <div className={"instrument_samples"}>
                {open &&
                    instrument.instrumentZones.map((z, i) => (
                        <SampleDisplay
                            key={i}
                            sample={z.sample}
                            onClick={() => selectSample(z.sample)}
                        ></SampleDisplay>
                    ))}
            </div>
        </div>
    );
}
