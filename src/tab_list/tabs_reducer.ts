import type { BankEditView } from "../core_backend/bank_view.ts";

interface Tab {
    readonly id: number;
}

/**
 * The elements shown before and after the current one in a tab, newest last.
 */
export interface ViewTrail {
    readonly back: readonly BankEditView[];
    readonly forward: readonly BankEditView[];
}

// Enough to find the way back, without keeping removed elements alive for long
const MAX_TRAIL_LENGTH = 50;

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
    readonly trails: ReadonlyMap<number, ViewTrail>;
}

export type TabsAction<T extends Tab> =
    | { type: "open"; tab: T }
    | { type: "close"; id: number }
    | { type: "activate"; id: number }
    | { type: "setView"; id: number; view: BankEditView }
    | {
          type: "goBack" | "goForward";
          id: number;
          /**
           * Whether an element can still be shown. Removed ones are skipped.
           */
          isAvailable: (view: BankEditView) => boolean;
      };

export function createTabsState<T extends Tab>(): TabsState<T> {
    return {
        tabs: [],
        activeId: undefined,
        views: new Map(),
        trails: new Map()
    };
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
            const trails = new Map(state.trails);
            trails.delete(action.id);
            const activeId =
                state.activeId === action.id
                    ? tabs[Math.min(index, tabs.length - 1)]?.id
                    : state.activeId;
            return { tabs, activeId, views, trails };
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
            const current = state.views.get(action.id) ?? "info";
            const views = new Map(state.views).set(action.id, action.view);
            if (current === action.view) {
                return { ...state, views };
            }
            const back = state.trails.get(action.id)?.back ?? [];
            return {
                ...state,
                views,
                trails: new Map(state.trails).set(action.id, {
                    back: [...back, current].slice(-MAX_TRAIL_LENGTH),
                    forward: []
                })
            };
        }

        case "goBack":
        case "goForward": {
            const trail = state.trails.get(action.id);
            if (!trail) {
                return state;
            }
            const isBack = action.type === "goBack";
            const from = [...(isBack ? trail.back : trail.forward)];
            const to = [...(isBack ? trail.forward : trail.back)];
            const current = state.views.get(action.id) ?? "info";
            // The shown element can be in the trail too, when the one between was removed
            let view = from.pop();
            while (
                view !== undefined &&
                (view === current || !action.isAvailable(view))
            ) {
                view = from.pop();
            }
            if (view === undefined) {
                return state;
            }
            to.push(current);
            return {
                ...state,
                views: new Map(state.views).set(action.id, view),
                trails: new Map(state.trails).set(
                    action.id,
                    isBack
                        ? { back: from, forward: to }
                        : { back: to, forward: from }
                )
            };
        }
    }
}
