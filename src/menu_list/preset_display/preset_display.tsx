import type { MappedPresetType } from "../menu_list.tsx";
import "./preset_display.css";
import type { BasicInstrument, BasicSample } from "spessasynth_core";
import { useState } from "react";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";

export function PresetDisplay({
    p,
    selectInstrument,
    onClick,
    selectSample
}: {
    p: MappedPresetType;
    selectInstrument: (i: BasicInstrument) => unknown;
    selectSample: (s: BasicSample) => unknown;
    onClick: () => unknown;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className={"preset_item_wrapper"}>
            <div className={"preset_item"}>
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
