// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { rememberFocus } from "./focus_return.ts";

const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/**
 * A focusable list with a row in it, like the element list.
 */
function createList() {
    const list = document.createElement("div");
    list.tabIndex = -1;
    const row = document.createElement("button");
    list.append(row);
    const elsewhere = document.createElement("button");
    document.body.replaceChildren(list, elsewhere);
    return { list, row, elsewhere };
}

describe("rememberFocus", () => {
    it("gives the focus back to the element", async () => {
        const { row, elsewhere } = createList();
        row.focus();
        const restore = rememberFocus();
        elsewhere.focus();
        restore();
        await nextFrame();
        expect(document.activeElement).toBe(row);
    });

    it("falls back to the focusable container when the element was removed", async () => {
        const { list, row } = createList();
        const restore = rememberFocus(row);
        restore();
        // The action that closed the menu deletes the row after the focus went back
        row.remove();
        await nextFrame();
        expect(document.activeElement).toBe(list);
    });

    it("leaves the focus alone when something else took it", async () => {
        const { row, elsewhere } = createList();
        const restore = rememberFocus(row);
        row.remove();
        restore();
        elsewhere.focus();
        await nextFrame();
        expect(document.activeElement).toBe(elsewhere);
    });
});
