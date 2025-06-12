import type { MappedPresetType } from "../menu_list.tsx";
import "./preset_display.css";
import type { BasicInstrument, BasicSample } from "spessasynth_core";
import { useEffect, useRef, useState } from "react";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import type { BankEditView } from "../../core_backend/sound_bank_manager.ts";

export function PresetDisplay({
    p,
    selectInstrument,
    onClick,
    selectSample,
    view
}: {
    p: MappedPresetType;
    selectInstrument: (i: BasicInstrument) => unknown;
    selectSample: (s: BasicSample) => unknown;
    onClick: () => unknown;
    view: BankEditView;
}) {
    const [open, setOpen] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const selected = view === p.preset;
    useEffect(() => {
        if (selected) {
            elementRef?.current?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [selected]);
    return (
        <div className={"preset_item_wrapper"} ref={elementRef}>
            <div className={`preset_item ${selected ? "selected" : ""}`}>
                <div className={"left_group"} onClick={() => setOpen(!open)}>
                    <span className={"triangle"}>
                        {open ? "\u25BC" : "\u25B6"}
                    </span>
                    <span className={"monospaced"}>
                        {p.searchString.substring(0, 7)}
                    </span>
                </div>
                <span
                    className={"monospaced preset_item_name"}
                    onClick={onClick}
                >
                    {p.preset.presetName}
                </span>
            </div>
            <div className={"preset_instruments"}>
                {open &&
                    p.preset.presetZones.map((z, i) => (
                        <InstrumentDisplay
                            view={view}
                            key={i}
                            instrument={z.instrument}
                            selectSample={selectSample}
                            onClick={() => selectInstrument(z.instrument)}
                        ></InstrumentDisplay>
                    ))}
            </div>
        </div>
    );
}
