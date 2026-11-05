import type { MouseEvent, PointerEvent } from "react";
import { useDeferredValue, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { SampleList } from "./sample_list.tsx";
import { InstrumentList } from "./instrument_list.tsx";
import { PresetList } from "./preset_list.tsx";
import { filterElements, keepUnused } from "./filter_elements.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { isEditorShortcut } from "../utils/is_editor_shortcut.ts";
import {
    getClickResult,
    getSelection,
    isInstrument,
    isPreset,
    isSample,
    type MultiSelection,
    selectionOf
} from "./menu_selection.ts";
import { useMenuShortcuts } from "./use_menu_shortcuts.ts";
import { useListMenu } from "./use_list_menu.ts";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import { useDragSource } from "../drag_and_drop/drag_context.ts";
import { getObjectId } from "../utils/object_id.ts";

const ARROW_STEPS = new Map([
    ["ArrowUp", -1],
    ["ArrowDown", 1]
]);

interface MenuListProps {
    view: BankEditView;
    /**
     * Whether the settings cover the editor, which turns the list shortcuts off.
     */
    isCovered: boolean;
}

export function MenuList({ view, isCovered }: MenuListProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    const instruments = useBankSnapshot(session.store, (s) => s.instruments);
    const presets = useBankSnapshot(session.store, (s) => s.presets);
    const views = useBankSnapshot(session.store, (s) => s.views);
    const [isOpen, setIsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isUnusedOnly, setIsUnusedOnly] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const [multiSelection, setMultiSelection] = useState<MultiSelection | null>(
        null
    );

    // Filtering thousands of elements must not delay typing
    const deferredQuery = useDeferredValue(searchQuery);
    const filtered = (() => {
        const found = filterElements(views, deferredQuery);
        const ids = isUnusedOnly ? keepUnused(views, found) : found;
        // The lists keep the core objects as identities, which the selection and handlers use
        const keep = <T extends object>(
            list: readonly T[],
            order: readonly number[]
        ) => {
            if (order.length === list.length) {
                return list;
            }
            const listed = new Set(order);
            return list.filter((e) => listed.has(getObjectId(e)));
        };
        return {
            presets: keep(presets, ids.presets),
            instruments: keep(instruments, ids.instruments),
            samples: keep(samples, ids.samples)
        };
    })();

    const listed = new Set<BankEntity>([
        ...filtered.presets,
        ...filtered.instruments,
        ...filtered.samples
    ]);
    const selection = getSelection(view, multiSelection, (e) => listed.has(e));
    const selectedPresets = selectionOf(selection, isPreset);
    const selectedInstruments = selectionOf(selection, isInstrument);
    const selectedSamples = selectionOf(selection, isSample);
    useMenuShortcuts(selection, isCovered);
    useEventListener(document, "keydown", (e) => {
        if (isCovered) {
            return;
        }
        // Ctrl+F finds elements, the list is what the user searches in the editor
        if (
            (e.ctrlKey || e.metaKey) &&
            e.key.toLowerCase() === "f" &&
            searchRef.current
        ) {
            e.preventDefault();
            searchRef.current.focus();
            searchRef.current.select();
            return;
        }
        // The arrow keys show the next or previous element of the shown one's list
        const step = ARROW_STEPS.get(e.key);
        if (
            step === undefined ||
            view === "info" ||
            e.ctrlKey ||
            e.metaKey ||
            e.altKey ||
            e.shiftKey ||
            !isEditorShortcut(e)
        ) {
            return;
        }
        const list: readonly BankEntity[] = isPreset(view)
            ? filtered.presets
            : isInstrument(view)
              ? filtered.instruments
              : filtered.samples;
        const index = list.indexOf(view);
        const next = index === -1 ? undefined : list[index + step];
        if (!next) {
            return;
        }
        e.preventDefault();
        setMultiSelection(null);
        setView(next);
    });
    const getMenuEntries = useListMenu();
    const { openMenu } = useContextMenu();
    const startDrag = useDragSource();

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
    // Like a file manager, the menu acts on the selection when the item is in it,
    // and otherwise shows the item first and acts on it alone
    const handleItemContextMenu = (item: BankEntity, event: MouseEvent) => {
        let target = selection;
        if (!selection.has(item)) {
            target = new Set([item]);
            setMultiSelection(null);
            setView(item);
        }
        openMenu(event, getMenuEntries(target));
    };

    // Dragging an item of the selection drags the whole selection
    const handleItemPointerDown = (item: BankEntity, event: PointerEvent) =>
        startDrag(event, {
            session,
            entities: selection.has(item) ? [...selection] : [item]
        });

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
                onItemContextMenu={handleItemContextMenu}
                onItemPointerDown={handleItemPointerDown}
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
                onItemContextMenu={handleItemContextMenu}
                onItemPointerDown={handleItemPointerDown}
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
                onItemContextMenu={handleItemContextMenu}
                onItemPointerDown={handleItemPointerDown}
            />
            <div className={"search_bar"}>
                <input
                    ref={searchRef}
                    className={"pretty_input"}
                    placeholder={t("presetList.search")}
                    aria-label={t("presetList.search")}
                    type={"text"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setSearchQuery("");
                        }
                    }}
                />
                {searchQuery === "" ? null : (
                    <button
                        type={"button"}
                        className={"pretty_button"}
                        aria-label={t("presetList.clearSearch")}
                        title={t("presetList.clearSearch")}
                        onClick={() => {
                            setSearchQuery("");
                            searchRef.current?.focus();
                        }}
                    >
                        &times;
                    </button>
                )}
                <button
                    type={"button"}
                    className={"pretty_button"}
                    aria-pressed={isUnusedOnly}
                    title={t("presetList.unusedOnlyTitle")}
                    onClick={() => setIsUnusedOnly((only) => !only)}
                >
                    {t("presetList.unusedOnly")}
                </button>
            </div>
        </div>
    );
}
