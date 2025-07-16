import "./instrument_display.css";
import type { BasicInstrument } from "spessasynth_core";
import * as React from "react";
import { useRef } from "react";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import { type BankEditView } from "../../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
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
    setView: SetViewType;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    view: BankEditView;
    open: boolean;
    setOpen: (o: boolean) => unknown;
    link: boolean;
    onLink?: () => unknown;
}) {
    const elementRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    return (
        <div className={"instrument_item_wrapper"} ref={elementRef}>
            <div
                className={`instrument_item ${selected ? "selected" : ""}`}
                title={instrument.instrumentName}
            >
                <div className={"left_buttons"}>
                    <span className={"triangle"} onClick={() => setOpen(!open)}>
                        {open ? "\u25BC" : "\u25B6"}
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
                    {instrument.instrumentName}
                </span>
            </div>
            <div className={"instrument_samples"}>
                {open &&
                    instrument.instrumentZones.map((z, i) => (
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
