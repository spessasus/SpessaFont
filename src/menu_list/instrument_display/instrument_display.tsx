import "./instrument_display.css";
import type { BasicInstrument } from "spessasynth_core";
import * as React from "react";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import type { BankEditView } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../../hooks/use_entity_revision.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons.tsx";

export function InstrumentDisplay({
    instrument,
    setView,
    onClick,
    view,
    open,
    setOpen,
    selected,
    link,
    onLink
}: {
    instrument: BasicInstrument;
    selected: boolean;
    setView: (view: BankEditView) => void;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    view: BankEditView;
    open: boolean;
    setOpen: (isOpen: boolean) => unknown;
    link: boolean;
    onLink?: () => unknown;
}) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    // Re-render when the instrument's zones or sample names change
    useEntityRevision(session.store, instrument);
    return (
        <div className={"instrument_item_wrapper"}>
            <div
                className={`instrument_item ${selected ? "selected" : ""}`}
                title={instrument.name}
            >
                <div className={"left_buttons"}>
                    <span className={"triangle"} onClick={() => setOpen(!open)}>
                        {open ? "\u{25BC}" : "\u{25B6}"}
                    </span>
                    {link && (
                        <span
                            title={t("instrumentLocale.linkSelectedSamples")}
                            onClick={onLink}
                        >
                            <LinkIcon />
                        </span>
                    )}
                </div>
                <span
                    className={"monospaced instrument_item_name"}
                    onClick={onClick}
                >
                    {instrument.name}
                </span>
            </div>
            <div className={"instrument_samples"}>
                {open &&
                    instrument.zones.map((z, i) => (
                        <SampleDisplay
                            selected={view === z.sample}
                            key={i}
                            sample={z.sample}
                            onClick={() => setView(z.sample)}
                        ></SampleDisplay>
                    ))}
            </div>
        </div>
    );
}
