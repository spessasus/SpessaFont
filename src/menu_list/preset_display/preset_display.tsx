import type { MappedPresetType } from "../menu_list.tsx";
import "./preset_display.css";
import * as React from "react";
import { useRef } from "react";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import type { BankEditView } from "../../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { useTranslation } from "react-i18next";

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
    selected,
    link,
    onLink
}: {
    p: MappedPresetType;
    setView: SetViewType;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    view: BankEditView;
    openedData: OpenPresetDisplayType;
    setOpenedData: (o: OpenPresetDisplayType) => unknown;
    selected: boolean;
    link: boolean;
    onLink?: () => unknown;
}) {
    const { t } = useTranslation();
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
                <div className={"left_group"}>
                    <span
                        className={"triangle"}
                        onClick={() =>
                            setOpenedData({
                                openInstruments: openedInstruments,
                                open: !open
                            })
                        }
                    >
                        {open ? "\u25BC" : "\u25B6"}
                    </span>
                    <span
                        className={"monospaced"}
                        onClick={() =>
                            setOpenedData({
                                openInstruments: openedInstruments,
                                open: !open
                            })
                        }
                    >
                        {p.searchString.substring(0, 7)}
                    </span>
                    {link && (
                        <span title={t("presetLocale.linkSelectedInstruments")}>
                            <svg
                                onClick={onLink}
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                className="bi bi-link-45deg"
                                viewBox="0 0 16 16"
                            >
                                <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z" />
                                <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z" />
                            </svg>
                        </span>
                    )}
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
                            link={false}
                        ></InstrumentDisplay>
                    ))}
            </div>
        </div>
    );
}
