import { useDeferredValue, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalDialog } from "./modal_dialog.tsx";
import { useLayout } from "../layout/layout_context.ts";
import { VirtualItemList } from "../menu_list/virtual_item_list.tsx";

export interface PickerOption {
    label: string;
    index: number;
}

interface ElementPickerProps {
    title: string;
    kind?: "sample";
    options: readonly PickerOption[];
    onAnswer: (index: number | undefined) => void;
}

/**
 * A searchable list of elements. The arrow keys move the highlight, which starts on the first
 * match, and Enter picks it. The search field stays focused, so the highlight is the only
 * cursor, and it tells screen readers which option is highlighted (a combobox).
 */
export function ElementPicker({
    title,
    kind,
    options,
    onAnswer
}: ElementPickerProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const listId = useId();
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query.toLowerCase());
    const matches =
        deferredQuery === ""
            ? options
            : options.filter((o) =>
                  o.label.toLowerCase().includes(deferredQuery)
              );
    const [highlighted, setHighlighted] = useState<PickerOption>();
    // Typing can filter the highlighted option out, then the first match is highlighted
    const current =
        highlighted && matches.includes(highlighted) ? highlighted : matches[0];

    const getOptionId = (option: PickerOption) => `${listId}-${option.index}`;

    const moveHighlight = (step: number) => {
        const index = current ? matches.indexOf(current) : -1;
        const next = matches[index + step];
        if (next) setHighlighted(next);
    };

    return (
        <ModalDialog
            title={title}
            className={"element_picker"}
            doesSkipFocus={layout === "phone"}
            onCancel={() => onAnswer(undefined)}
        >
            <input
                className={"pretty_input"}
                type={"search"}
                role={"combobox"}
                aria-expanded={true}
                aria-controls={listId}
                aria-autocomplete={"list"}
                aria-activedescendant={
                    current ? getOptionId(current) : undefined
                }
                // The soft keyboard would cover the list the moment the picker opens
                autoFocus={layout !== "phone"}
                placeholder={t("presetList.search")}
                aria-label={t("presetList.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    switch (e.key) {
                        case "Enter": {
                            // A dialog asked next would take this Enter as its own answer
                            e.preventDefault();
                            // The matches may still be for older text, typing is deferred
                            const typed = e.currentTarget.value.toLowerCase();
                            const picked =
                                typed === deferredQuery
                                    ? current
                                    : options.find((o) =>
                                          o.label.toLowerCase().includes(typed)
                                      );
                            if (picked) onAnswer(picked.index);
                            break;
                        }

                        case "ArrowDown": {
                            e.preventDefault();
                            moveHighlight(1);
                            break;
                        }

                        case "ArrowUp": {
                            e.preventDefault();
                            moveHighlight(-1);
                            break;
                        }
                    }
                }}
            />
            <div
                id={listId}
                className={"element_picker_list"}
                role={"listbox"}
                data-kind={layout === "phone" ? kind : undefined}
                aria-label={title}
            >
                {matches.length === 0 ? (
                    <p className={"element_picker_empty"}>
                        {t("contextMenu.noMatches")}
                    </p>
                ) : (
                    <VirtualItemList
                        // A new search starts at the top, where the first match is
                        key={deferredQuery}
                        items={matches}
                        focusedItem={current}
                        renderItem={(option) => (
                            <button
                                type={"button"}
                                id={getOptionId(option)}
                                role={"option"}
                                aria-selected={option === current}
                                // Out of the Tab order, a focused row would be a second cursor
                                tabIndex={-1}
                                className={
                                    "plain_button monospaced element_picker_item"
                                }
                                title={option.label}
                                onClick={() => onAnswer(option.index)}
                            >
                                {option.label}
                            </button>
                        )}
                    />
                )}
            </div>
            <div className={"modal_dialog_buttons"}>
                <button
                    type={"button"}
                    className={"pretty_button hover_brightness"}
                    onClick={() => onAnswer(undefined)}
                >
                    {t("contextMenu.cancel")}
                </button>
            </div>
        </ModalDialog>
    );
}
