import type { BankEditView } from "../core_backend/bank_view.ts";

interface Tab {
    readonly id: number;
}

export interface TabsState<T extends Tab> {
    /**
     * Newest first.
     */
    readonly tabs: readonly T[];
    readonly activeId: number | undefined;
    /**
     * The selected element of each tab, by tab id. Tabs without an entry show the overview.
     */
    readonly views: ReadonlyMap<number, BankEditView>;
}

export type TabsAction<T extends Tab> =
    | { type: "open"; tab: T }
    | { type: "close"; id: number }
    | { type: "activate"; id: number }
    | { type: "setView"; id: number; view: BankEditView };

export function createTabsState<T extends Tab>(): TabsState<T> {
    return { tabs: [], activeId: undefined, views: new Map() };
}

/**
 * Tab list state. Closing the active tab activates its right neighbor, or the left one
 * if it was the last. Side effects such as releasing the closed bank happen in the caller.
 */
export function tabsReducer<T extends Tab>(
    state: TabsState<T>,
    action: TabsAction<T>
): TabsState<T> {
    switch (action.type) {
        case "open": {
            return {
                ...state,
                tabs: [action.tab, ...state.tabs],
                activeId: action.tab.id
            };
        }

        case "close": {
            const index = state.tabs.findIndex((t) => t.id === action.id);
            if (index === -1) {
                return state;
            }
            const tabs = state.tabs.toSpliced(index, 1);
            const views = new Map(state.views);
            views.delete(action.id);
            const activeId =
                state.activeId === action.id
                    ? tabs[Math.min(index, tabs.length - 1)]?.id
                    : state.activeId;
            return { tabs, activeId, views };
        }

        case "activate": {
            return state.tabs.every((t) => t.id !== action.id)
                ? state
                : { ...state, activeId: action.id };
        }

        case "setView": {
            if (state.tabs.every((t) => t.id !== action.id)) {
                return state;
            }
            return {
                ...state,
                views: new Map(state.views).set(action.id, action.view)
            };
        }
    }
}
