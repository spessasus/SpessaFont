import { describe, expect, it } from "vitest";
import {
    createTabsState,
    tabsReducer,
    type TabsState
} from "./tabs_reducer.ts";

interface TestTab {
    id: number;
}

function stateWith(ids: number[], activeId?: number): TabsState<TestTab> {
    let state = createTabsState<TestTab>();
    // Opening puts each tab first, so open in reverse to get the given order
    for (const id of ids.toReversed()) {
        state = tabsReducer(state, { type: "open", tab: { id } });
    }
    return activeId === undefined
        ? state
        : tabsReducer(state, { type: "activate", id: activeId });
}

const ids = (state: TabsState<TestTab>) => state.tabs.map((t) => t.id);

describe("tabsReducer", () => {
    it("opens new tabs first and activates them", () => {
        const state = stateWith([1, 2]);
        const next = tabsReducer(state, { type: "open", tab: { id: 3 } });

        expect(ids(next)).toEqual([3, 1, 2]);
        expect(next.activeId).toBe(3);
    });

    it("keeps the active tab when closing another one", () => {
        const state = stateWith([1, 2, 3], 3);
        const next = tabsReducer(state, { type: "close", id: 1 });

        expect(ids(next)).toEqual([2, 3]);
        expect(next.activeId).toBe(3);
    });

    it("activates the right neighbor when closing the active tab", () => {
        const next = tabsReducer(stateWith([1, 2, 3], 2), {
            type: "close",
            id: 2
        });

        expect(next.activeId).toBe(3);
    });

    it("activates the left neighbor when closing the last tab", () => {
        const next = tabsReducer(stateWith([1, 2, 3], 3), {
            type: "close",
            id: 3
        });

        expect(next.activeId).toBe(2);
    });

    it("has no active tab after closing the only one", () => {
        const next = tabsReducer(stateWith([1]), { type: "close", id: 1 });

        expect(next.tabs).toEqual([]);
        expect(next.activeId).toBeUndefined();
    });

    it("stores views per tab and forgets them on close", () => {
        let state = stateWith([1, 2], 1);
        state = tabsReducer(state, { type: "setView", id: 2, view: "info" });
        expect(state.views.get(2)).toBe("info");

        state = tabsReducer(state, { type: "close", id: 2 });
        expect(state.views.has(2)).toBe(false);
    });

    it("ignores actions for tabs that are not open", () => {
        const state = stateWith([1], 1);

        expect(tabsReducer(state, { type: "close", id: 9 })).toBe(state);
        expect(tabsReducer(state, { type: "activate", id: 9 })).toBe(state);
        expect(
            tabsReducer(state, { type: "setView", id: 9, view: "info" })
        ).toBe(state);
    });
});
