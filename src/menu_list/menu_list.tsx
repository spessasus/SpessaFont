import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import type { MouseEvent } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { SampleList } from "./sample_list.tsx";
import { InstrumentList } from "./instrument_list.tsx";
import { PresetList } from "./preset_list.tsx";
import { filterElements } from "./filter_elements.ts";
import {
    getClickResult,
    getSelection,
    type MultiSelection,
    selectionOf
} from "./menu_selection.ts";
import { useMenuShortcuts } from "./use_menu_shortcuts.ts";

const isPreset = (e: BankEntity) => e instanceof BasicPreset;
const isInstrument = (e: BankEntity) => e instanceof BasicInstrument;
const isSample = (e: BankEntity) => e instanceof BasicSample;

interface MenuListProps {
    view: BankEditView;
}

export function MenuList({ view }: MenuListProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    const instruments = useBankSnapshot(session.store, (s) => s.instruments);
    const presets = useBankSnapshot(session.store, (s) => s.presets);
    const [isOpen, setIsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [multiSelection, setMultiSelection] = useState<MultiSelection | null>(
        null
    );

    // Filtering thousands of elements must not delay typing
    const deferredQuery = useDeferredValue(searchQuery);
    const filtered = useMemo(
        () => filterElements({ presets, instruments, samples }, deferredQuery),
        [presets, instruments, samples, deferredQuery]
    );

    const selection = getSelection(view, multiSelection);
    const selectedPresets = selectionOf(selection, isPreset);
    const selectedInstruments = selectionOf(selection, isInstrument);
    const selectedSamples = selectionOf(selection, isSample);
    useMenuShortcuts(selection);

    function handleItemClick<T extends BankEntity>(
        items: readonly T[],
        selected: ReadonlySet<T>,
        item: T,
        event: MouseEvent
    ) {
        const result = getClickResult(items, item, view, selected, event);
        if (result.type === "show") {
            setMultiSelection(null);
            setView(result.entity);
        } else {
            setMultiSelection(result.selection);
        }
    }

    if (!isOpen) {
        return (
            <button
                type={"button"}
                className={"plain_button menu_list_closed"}
                aria-label={t("expand")}
                onClick={() => setIsOpen(true)}
            >
                {"\u{25B6}"}
            </button>
        );
    }
    return (
        <div className={`menu_list_main`}>
            <div
                className={`item_group_header hover_brightness ${view === "info" ? "opened" : ""}`}
            >
                <h2>
                    <button
                        type={"button"}
                        className={"plain_button item_group_title"}
                        onClick={() => setView("info")}
                    >
                        {t("presetList.overview")}
                    </button>
                </h2>
                <div className={"right_buttons"}>
                    <button
                        type={"button"}
                        className={"plain_button dropdown_triangle"}
                        aria-label={t("collapse")}
                        title={t("collapse")}
                        onClick={() => setIsOpen(false)}
                    >
                        {"\u{25C0}"}
                    </button>
                </div>
            </div>

            <SampleList
                samples={filtered.samples}
                view={view}
                selected={selectedSamples}
                onItemClick={(sample, e) =>
                    handleItemClick(
                        filtered.samples,
                        selectedSamples,
                        sample,
                        e
                    )
                }
            />

            <InstrumentList
                instruments={filtered.instruments}
                view={view}
                selected={selectedInstruments}
                selectedSamples={selectedSamples}
                onItemClick={(instrument, e) =>
                    handleItemClick(
                        filtered.instruments,
                        selectedInstruments,
                        instrument,
                        e
                    )
                }
            />

            <PresetList
                presets={filtered.presets}
                view={view}
                selected={selectedPresets}
                selectedInstruments={selectedInstruments}
                onItemClick={(preset, e) =>
                    handleItemClick(
                        filtered.presets,
                        selectedPresets,
                        preset,
                        e
                    )
                }
            />
            <div className={"search_bar"}>
                <input
                    className={"pretty_input"}
                    placeholder={t("presetList.search")}
                    aria-label={t("presetList.search")}
                    type={"text"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    );
}
