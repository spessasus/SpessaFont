import type { RefObject } from "react";
import { useTranslation } from "react-i18next";

interface ListSearchBarProps {
    inputRef: RefObject<HTMLInputElement | null>;
    query: string;
    onQueryChange: (query: string) => void;
    isUnusedOnly: boolean;
    onToggleUnusedOnly: () => void;
    /**
     * Moves the focus from the search field to the listed elements.
     */
    onFocusResults: () => void;
}

/**
 * The search field of the element lists and the "Unused" filter.
 */
export function ListSearchBar({
    inputRef,
    query,
    onQueryChange,
    isUnusedOnly,
    onToggleUnusedOnly,
    onFocusResults
}: ListSearchBarProps) {
    const { t } = useTranslation();
    return (
        <div className={"list_search_bar"}>
            <input
                ref={inputRef}
                className={"pretty_input"}
                placeholder={t("presetList.search")}
                aria-label={t("presetList.searchLabel")}
                type={"text"}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        onQueryChange("");
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        onFocusResults();
                    }
                }}
            />
            {query === "" ? null : (
                <button
                    type={"button"}
                    className={"pretty_button"}
                    aria-label={t("presetList.clearSearch")}
                    title={t("presetList.clearSearch")}
                    onClick={() => {
                        onQueryChange("");
                        inputRef.current?.focus();
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
                onClick={onToggleUnusedOnly}
            >
                {t("presetList.unusedOnly")}
            </button>
        </div>
    );
}
