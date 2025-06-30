import "./instrument_display.css";
import type { BasicInstrument } from "spessasynth_core";
import * as React from "react";
import { useRef } from "react";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import { type BankEditView } from "../../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { useTranslation } from "react-i18next";

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
                            <svg
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
