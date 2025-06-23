import type { MappedPresetType } from "../menu_list.tsx";
import "./preset_display.css";
import * as React from "react";
import { useRef } from "react";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import type { BankEditView } from "../../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";

export type OpenPresetDisplayType = {
    open: boolean;
    openInstruments: Record<string, boolean>;
};

export function PresetDisplay({
    p,
    onClick,
    view,
    openedData,
    setOpenedData,
    setView,
    selected
}: {
    p: MappedPresetType;
    setView: SetViewType;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    view: BankEditView;
    openedData: OpenPresetDisplayType;
    setOpenedData: (o: OpenPresetDisplayType) => unknown;
    selected: boolean;
}) {
    const open = openedData.open;
    const openedInstruments: Record<string, boolean> =
        openedData.openInstruments ?? {};
    const elementRef = useRef<HTMLDivElement>(null);
    return (
        <div className={"preset_item_wrapper"} ref={elementRef}>
            <div
                className={`preset_item ${selected ? "selected" : ""}`}
                title={p.preset.presetName}
            >
                <div
                    className={"left_group"}
                    onClick={() =>
                        setOpenedData({
                            openInstruments: openedInstruments,
                            open: !open
                        })
                    }
                >
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
                            open={
                                openedInstruments[
                                    z.instrument.instrumentName
                                ] ?? false
                            }
                            setOpen={(isOpen) =>
                                setOpenedData({
                                    ...openedData,
                                    openInstruments: {
                                        ...openedInstruments,
                                        [z.instrument.instrumentName]: isOpen
                                    }
                                })
                            }
                            selected={view === z.instrument}
                            view={view}
                            key={i}
                            instrument={z.instrument}
                            setView={setView}
                            onClick={() => setView(z.instrument)}
                        ></InstrumentDisplay>
                    ))}
            </div>
        </div>
    );
}
