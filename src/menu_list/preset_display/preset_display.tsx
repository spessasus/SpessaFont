import type { MappedPresetType } from "../menu_list.tsx";
import "./preset_display.css";
import * as React from "react";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import type { BankEditView } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../../hooks/use_entity_revision.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons.tsx";
import { typedMemo } from "../../utils/typed_memo.ts";

export interface OpenPresetDisplayType {
    open: boolean;
    openInstruments: Record<string, boolean>;
}

const PresetString = typedMemo(({ n }: { n: number }) => {
    return (
        <span className={"monospaced"} style={{ opacity: n === 0 ? 0.5 : 1 }}>
            {n.toString().padStart(3, "0")}
        </span>
    );
});

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
    setView: (view: BankEditView) => void;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    view: BankEditView;
    openedData: OpenPresetDisplayType;
    setOpenedData: (o: OpenPresetDisplayType) => unknown;
    selected: boolean;
    link: boolean;
    onLink?: () => unknown;
}) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    // Re-render when the preset's zones or instrument names change
    useEntityRevision(session.store, p.preset);
    const isOpen = openedData.open;
    const openedInstruments: Record<string, boolean> =
        openedData.openInstruments ?? {};
    return (
        <div className={"preset_item_wrapper"}>
            <div
                className={`preset_item ${selected ? "selected" : ""}`}
                title={p.preset.name}
            >
                <div className={"left_group"}>
                    <span
                        className={"triangle"}
                        onClick={() =>
                            setOpenedData({
                                openInstruments: openedInstruments,
                                open: !isOpen
                            })
                        }
                    >
                        {isOpen ? "\u{25BC}" : "\u{25B6}"}
                    </span>
                    <span
                        className={"monospaced midi_patch"}
                        onClick={() =>
                            setOpenedData({
                                openInstruments: openedInstruments,
                                open: !isOpen
                            })
                        }
                    >
                        {p.preset.isGMGSDrum && `DRUMS:${p.preset.program}`}
                        {!p.preset.isGMGSDrum && (
                            <>
                                <PresetString n={p.preset.bankLSB} />:
                                <PresetString n={p.preset.bankMSB} />:
                                <PresetString n={p.preset.program} />
                            </>
                        )}
                    </span>
                    {link && (
                        <span
                            title={t("presetLocale.linkSelectedInstruments")}
                            onClick={onLink}
                        >
                            <LinkIcon />
                        </span>
                    )}
                </div>
                <span
                    className={"monospaced preset_item_name"}
                    onClick={onClick}
                >
                    {p.preset.name}
                </span>
            </div>
            <div className={"preset_instruments"}>
                {isOpen &&
                    p.preset.zones.map((z, i) => (
                        <InstrumentDisplay
                            open={openedInstruments[z.instrument.name] ?? false}
                            setOpen={(isOpen) =>
                                setOpenedData({
                                    ...openedData,
                                    openInstruments: {
                                        ...openedInstruments,
                                        [z.instrument.name]: isOpen
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
