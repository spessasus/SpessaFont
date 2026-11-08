import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useDeferredValue, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import "./menu_list_phone.css";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { SampleList } from "./sample_list.tsx";
import { InstrumentList } from "./instrument_list.tsx";
import { PresetList } from "./preset_list.tsx";
import { filterElements, keepUnused } from "./filter_elements.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import {
    ELEMENT_LIST_SCOPE,
    isListShortcut
} from "../utils/is_editor_shortcut.ts";
import {
    getClickResult,
    getListKeyResult,
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
import type { FocusRequest } from "./virtual_item_list.tsx";
import { ListSearchBar } from "./list_search_bar.tsx";
import { useSectionsOpen } from "./use_list_state.ts";
import { useLayout } from "../layout/layout_context.ts";

interface MenuListProps {
    view: BankEditView;
    /**
     * Whether the settings cover the editor, which turns the list shortcuts off.
     */
    isCovered: boolean;
    /**
     * Replaces the Overview header and its collapse button.
     */
    header?: ReactNode;
    /**
     * Shows an element while browsing (the list keys, a row's menu) without counting as a pick,
     * so the phone navigator stays open. Falls back to the context's `setView`.
     */
    onPreview?: (entity: BankEntity) => void;
}

export function MenuList({
    view,
    isCovered,
    header,
    onPreview
}: MenuListProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    const preview = onPreview ?? setView;
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    const instruments = useBankSnapshot(session.store, (s) => s.instruments);
    const presets = useBankSnapshot(session.store, (s) => s.presets);
    const [isOpen, setIsOpen] = useState(true);
    const layout = useLayout();
    const sections = useSectionsOpen(view, layout === "phone");
    const rowEstimate = layout === "phone" ? 48 : undefined;
    const [searchQuery, setSearchQuery] = useState("");
    const [isUnusedOnly, setIsUnusedOnly] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const [multiSelection, setMultiSelection] = useState<MultiSelection | null>(
        null
    );
    const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
    // A multi selection belongs to the view it was made for, so it is dropped when another
    // element is shown, and does not come back with its anchor later
    const [selectionView, setSelectionView] = useState(view);
    if (view !== selectionView) {
        setSelectionView(view);
        setMultiSelection(null);
    }

    // Filtering thousands of elements must not delay typing
    const deferredQuery = useDeferredValue(searchQuery);
    const isFiltering = deferredQuery !== "" || isUnusedOnly;
    // Every edit makes new views, so the lists only follow them while they filter
    const views = useBankSnapshot(session.store, (s) =>
        isFiltering ? s.views : null
    );
    const filtered = (() => {
        if (!views) {
            return { presets, instruments, samples };
        }
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
    const listOf = (entity: BankEntity): readonly BankEntity[] =>
        isPreset(entity)
            ? filtered.presets
            : isInstrument(entity)
              ? filtered.instruments
              : filtered.samples;

    // Only a multi selection needs to know what is listed
    const listed = multiSelection
        ? new Set<BankEntity>(listOf(multiSelection.anchor))
        : undefined;
    const selection = getSelection(
        view,
        multiSelection,
        (e) => listed?.has(e) ?? false
    );
    const selectedPresets = selectionOf(selection, isPreset);
    const selectedInstruments = selectionOf(selection, isInstrument);
    const selectedSamples = selectionOf(selection, isSample);
    const cursor =
        view === "info"
            ? undefined
            : multiSelection?.anchor === view
              ? (multiSelection.cursor ?? view)
              : view;
    useMenuShortcuts(selection, isCovered);

    const show = (entity: BankEntity) => {
        setMultiSelection(null);
        setView(entity);
    };
    const showPreview = (entity: BankEntity) => {
        setMultiSelection(null);
        preview(entity);
    };

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
        // The list keys act when the focus is in the element list or on nothing, the editors
        // handle their own keys
        if (view === "info" || e.altKey || !isListShortcut(e)) {
            return;
        }
        const result = getListKeyResult(
            listOf(view),
            view,
            multiSelection,
            e.key,
            e
        );
        if (!result) {
            return;
        }
        e.preventDefault();
        if (result.type === "show") {
            showPreview(result.entity);
            setFocusRequest({ item: result.entity });
        } else if (result.type === "select") {
            setMultiSelection(result.selection);
            setFocusRequest({ item: result.selection.cursor ?? view });
        } else {
            setMultiSelection(null);
        }
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
            show(result.entity);
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
    // ArrowDown in the search goes to the results, the shown element or the first one listed
    const focusResults = () => {
        const shown = cursor && listOf(cursor).includes(cursor) ? cursor : null;
        const first =
            shown ??
            filtered.samples[0] ??
            filtered.instruments[0] ??
            filtered.presets[0];
        if (!first) {
            return;
        }
        if (first !== cursor) {
            showPreview(first);
        }
        setFocusRequest({ item: first });
    };

    // Like a file manager, the menu acts on the selection when the item is in it,
    // and otherwise shows the item first and acts on it alone
    const handleItemContextMenu = (item: BankEntity, event: MouseEvent) => {
        let target = selection;
        if (!selection.has(item)) {
            target = new Set([item]);
            showPreview(item);
        }
        openMenu(event, getMenuEntries(target));
    };

    // Dragging an item of the selection drags the whole selection
    const handleItemPointerDown = (item: BankEntity, event: PointerEvent) => {
        const entities = selection.has(item) ? [...selection] : [item];
        // The label is the name when the drag starts, read from the views like in render
        const [first] = entities;
        const current = session.store.getSnapshot().views;
        const name =
            (isPreset(first)
                ? current.presets
                : isInstrument(first)
                  ? current.instruments
                  : current.samples
            ).get(getObjectId(first))?.name ?? "";
        startDrag(event, {
            session,
            entities,
            label:
                entities.length > 1 ? `${name} +${entities.length - 1}` : name
        });
    };

    const isEmpty =
        filtered.presets.length +
            filtered.instruments.length +
            filtered.samples.length ===
        0;
    return (
        // Focusable, so the focus has somewhere to go when the focused row is deleted
        <div className={`menu_list_main`} {...ELEMENT_LIST_SCOPE} tabIndex={-1}>
            {header ?? (
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
            )}

            <SampleList
                isOpen={sections.isOpen("samples")}
                onOpenChange={(open) => sections.setOpen("samples", open)}
                rowEstimate={rowEstimate}
                samples={filtered.samples}
                view={view}
                selected={selectedSamples}
                cursor={cursor}
                focusRequest={focusRequest}
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
                isOpen={sections.isOpen("instruments")}
                onOpenChange={(open) => sections.setOpen("instruments", open)}
                rowEstimate={rowEstimate}
                instruments={filtered.instruments}
                view={view}
                selected={selectedInstruments}
                selectedSamples={selectedSamples}
                cursor={cursor}
                focusRequest={focusRequest}
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
                isOpen={sections.isOpen("presets")}
                onOpenChange={(open) => sections.setOpen("presets", open)}
                rowEstimate={rowEstimate}
                presets={filtered.presets}
                view={view}
                selected={selectedPresets}
                selectedInstruments={selectedInstruments}
                cursor={cursor}
                focusRequest={focusRequest}
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
            {isFiltering && isEmpty ? (
                <p className={"menu_list_empty"} role={"status"}>
                    {deferredQuery === ""
                        ? t("presetList.nothingUnused")
                        : t("contextMenu.noMatches")}
                </p>
            ) : null}
            <ListSearchBar
                inputRef={searchRef}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                isUnusedOnly={isUnusedOnly}
                onToggleUnusedOnly={() => setIsUnusedOnly((only) => !only)}
                onFocusResults={focusResults}
            />
            {layout === "phone" && isUnusedOnly ? (
                <p className={"menu_list_unused_note"}>
                    {t("phoneLocale.navigator.unusedNote")}
                </p>
            ) : null}
        </div>
    );
}
