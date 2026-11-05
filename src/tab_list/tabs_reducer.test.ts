import { describe, expect, it } from "vitest";
import { BasicInstrument } from "spessasynth_core";
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

const isAvailable = () => true;

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

    it("goes back and forward between the shown elements", () => {
        let next = stateWith([1], 1);
        const a = new BasicInstrument();
        const b = new BasicInstrument();
        next = tabsReducer(next, { type: "setView", id: 1, view: a });
        next = tabsReducer(next, { type: "setView", id: 1, view: b });

        next = tabsReducer(next, { type: "goBack", id: 1, isAvailable });
        expect(next.views.get(1)).toBe(a);
        next = tabsReducer(next, { type: "goBack", id: 1, isAvailable });
        expect(next.views.get(1)).toBe("info");
        next = tabsReducer(next, { type: "goForward", id: 1, isAvailable });
        expect(next.views.get(1)).toBe(a);

        // Showing something new drops the way forward
        next = tabsReducer(next, { type: "setView", id: 1, view: "info" });
        expect(
            tabsReducer(next, { type: "goForward", id: 1, isAvailable })
        ).toBe(next);
    });

    it("skips removed elements when going back", () => {
        const a = new BasicInstrument();
        const b = new BasicInstrument();
        let next = stateWith([1], 1);
        next = tabsReducer(next, { type: "setView", id: 1, view: a });
        next = tabsReducer(next, { type: "setView", id: 1, view: b });
        next = tabsReducer(next, {
            type: "goBack",
            id: 1,
            isAvailable: (view) => view !== a
        });
        expect(next.views.get(1)).toBe("info");
    });
});
