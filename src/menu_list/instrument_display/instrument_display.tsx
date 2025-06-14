import "./instrument_display.css";
import type { BasicInstrument, BasicSample } from "spessasynth_core";
import { useEffect, useRef, useState } from "react";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import type { BankEditView } from "../../core_backend/sound_bank_manager.ts";

export function InstrumentDisplay({
    instrument,
    selectSample,
    onClick,
    view
}: {
    instrument: BasicInstrument;
    selectSample: (s: BasicSample) => unknown;
    onClick: () => unknown;
    view: BankEditView;
}) {
    const [open, setOpen] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const selected = view === instrument;
    useEffect(() => {
        if (selected) {
            elementRef?.current?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [selected]);
    return (
        <div className={"instrument_item_wrapper"} ref={elementRef}>
            <div className={`instrument_item ${selected ? "selected" : ""}`}>
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
                            view={view}
                            key={i}
                            sample={z.sample}
                            onClick={() => selectSample(z.sample)}
                        ></SampleDisplay>
                    ))}
            </div>
        </div>
    );
}
