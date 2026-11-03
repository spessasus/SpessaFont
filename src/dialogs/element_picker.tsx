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
 * A searchable list of elements. Enter picks the first match.
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
                    if (e.key === "Enter" && matches.length > 0) {
                        onAnswer(matches[0].index);
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
                        focusedItem={undefined}
                        renderItem={(option) => (
                            <button
                                type={"button"}
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
