import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalDialog } from "./modal_dialog.tsx";
import { VirtualItemList } from "../menu_list/virtual_item_list.tsx";

export interface PickerOption {
    label: string;
    index: number;
}

interface ElementPickerProps {
    title: string;
    options: readonly PickerOption[];
    onAnswer: (index: number | undefined) => void;
}

/**
 * A searchable list of elements. The arrow keys move the highlight, which starts on the first
 * match, and Enter picks it.
 */
export function ElementPicker({
    title,
    options,
    onAnswer
}: ElementPickerProps) {
    const { t } = useTranslation();
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

    const moveHighlight = (step: number) => {
        const index = current ? matches.indexOf(current) : -1;
        const next = matches[index + step];
        if (next) setHighlighted(next);
    };

    return (
        <ModalDialog
            title={title}
            className={"element_picker"}
            onCancel={() => onAnswer(undefined)}
        >
            <input
                className={"pretty_input"}
                type={"search"}
                autoFocus={true}
                placeholder={t("presetList.search")}
                aria-label={t("presetList.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    switch (e.key) {
                        case "Enter": {
                            if (current) onAnswer(current.index);
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
            <div className={"element_picker_list"}>
                {matches.length === 0 ? (
                    <p className={"element_picker_empty"}>
                        {t("contextMenu.noMatches")}
                    </p>
                ) : (
                    <VirtualItemList
                        items={matches}
                        focusedItem={current}
                        renderItem={(option) => (
                            <button
                                type={"button"}
                                className={
                                    "plain_button monospaced element_picker_item"
                                }
                                title={option.label}
                                data-highlighted={option === current}
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
