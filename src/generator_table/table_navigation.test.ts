// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    findGridItem,
    focusNeighborColumn,
    getTabKey,
    handleTableKeyDown,
    type TableKeyEvent
} from "./table_navigation.ts";

/**
 * A table laid out like the generator table: the header with the add button, the global zone
 * (no buttons) and a stereo column, the modulator row, a number row, the split pan row and a
 * select row.
 */
const TABLE = `
<table>
    <thead>
        <tr>
            <th><button data-grid-key="add"></button></th>
            <th>Global</th>
            <th colspan="2">
                <button data-grid-key="name:5"></button>
                <button data-grid-key="delete:5"></button>
            </th>
            <th>
                <button data-grid-key="name:7"></button>
                <button data-grid-key="delete:7"></button>
            </th>
        </tr>
        <tr>
            <th>Modulators</th>
            <th><button data-grid-key="modulators:1"></button></th>
            <th colspan="2"><button data-grid-key="modulators:5"></button></th>
            <th><button data-grid-key="modulators:7"></button></th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>Attenuation</th>
            <td><input data-grid-key="cell:48:1"></td>
            <td colspan="2"><input data-grid-key="cell:48:5"></td>
            <td><input data-grid-key="cell:48:7"></td>
        </tr>
        <tr>
            <th>Pan</th>
            <td><input data-grid-key="cell:17:1"></td>
            <td><input data-grid-key="cell:17:5"></td>
            <td><input data-grid-key="cell:17:6"></td>
            <td><input data-grid-key="cell:17:7"></td>
        </tr>
        <tr>
            <th>Looping Mode</th>
            <td><select data-grid-key="cell:54:1"><option>a</option><option>b</option></select></td>
            <td colspan="2"><select data-grid-key="cell:54:5"><option>a</option><option>b</option></select></td>
            <td><select data-grid-key="cell:54:7"><option>a</option><option>b</option></select></td>
        </tr>
    </tbody>
</table>`;

function getTable() {
    const table = document.querySelector("table");
    if (!table) {
        throw new Error("No table.");
    }
    return table;
}

function getItem(key: string) {
    const item = findGridItem(document.body, key);
    if (!item) {
        throw new Error(`No item ${key}.`);
    }
    return item;
}

/**
 * Presses a key on an item and returns the event and where the focus went.
 */
function press(
    from: string,
    key: string,
    modifiers: Partial<
        Pick<TableKeyEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey">
    > = {}
) {
    const target = getItem(from);
    target.focus();
    const onMove = vi.fn();
    const event = {
        key,
        target,
        currentTarget: getTable(),
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        defaultPrevented: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...modifiers
    };
    handleTableKeyDown(event, onMove);
    const focused =
        document.activeElement instanceof HTMLElement
            ? document.activeElement.dataset.gridKey
            : undefined;
    return { event, onMove, focused };
}

beforeEach(() => {
    document.body.innerHTML = TABLE;
});

describe("handleTableKeyDown", () => {
    it("moves up and down by visual column, across merged and split cells", () => {
        expect(press("cell:48:5", "ArrowDown").focused).toBe("cell:17:5");
        expect(press("cell:17:6", "ArrowUp").focused).toBe("cell:48:5");
        expect(press("cell:48:1", "ArrowUp").focused).toBe("modulators:1");
        expect(press("modulators:5", "ArrowUp").focused).toBe("name:5");
    });

    it("skips rows without an item in the column and stays at the edges", () => {
        // The global zone has no header buttons
        expect(press("modulators:1", "ArrowUp").focused).toBe("modulators:1");
        // The row header is not an item
        expect(press("cell:48:1", "ArrowLeft").focused).toBe("cell:48:1");
        expect(press("cell:54:7", "ArrowDown").focused).toBe("cell:54:7");
    });

    it("moves between the buttons of a header cell and over cells in a row", () => {
        expect(press("name:5", "ArrowRight").focused).toBe("delete:5");
        expect(press("delete:5", "ArrowRight").focused).toBe("name:7");
        expect(press("cell:17:1", "End").focused).toBe("cell:17:7");
        expect(press("cell:54:7", "Home", { ctrlKey: true }).focused).toBe(
            "add"
        );
    });

    it("moves onto and past a select without letting it change", () => {
        const { event, focused } = press("cell:17:5", "ArrowDown");
        expect(focused).toBe("cell:54:5");
        const onSelect = press("cell:54:5", "ArrowDown");
        expect(onSelect.focused).toBe("cell:54:5");
        // A closed select changes its value on an arrow key unless it is prevented
        expect(onSelect.event.preventDefault).toHaveBeenCalled();
        expect(press("cell:54:5", "ArrowUp").focused).toBe("cell:17:5");
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it("tells whether a move extends the selection", () => {
        const { onMove } = press("cell:48:1", "ArrowRight", { shiftKey: true });
        expect(onMove).toHaveBeenCalledWith("cell:48:1", "cell:48:5", true);
        expect(press("cell:48:1", "ArrowDown").onMove).toHaveBeenCalledWith(
            "cell:48:1",
            "cell:17:1",
            false
        );
    });

    it("keeps its keys from the document shortcuts, except undo, redo and save", () => {
        for (const key of ["Delete", "ArrowLeft", "c", "Enter"]) {
            expect(
                press("cell:48:1", key).event.stopPropagation,
                key
            ).toHaveBeenCalled();
        }
        for (const key of ["c", "x", "v", "d"]) {
            expect(
                press("cell:48:1", key, { ctrlKey: true }).event
                    .stopPropagation,
                key
            ).toHaveBeenCalled();
        }
        for (const key of ["z", "y", "s", "Z"]) {
            expect(
                press("cell:48:1", key, { ctrlKey: true }).event
                    .stopPropagation,
                key
            ).not.toHaveBeenCalled();
        }
        expect(
            press("cell:48:1", "ArrowLeft", { altKey: true }).event
                .stopPropagation
        ).not.toHaveBeenCalled();
    });
});

describe("focusNeighborColumn", () => {
    it("focuses the same button of the next column, or the previous one", () => {
        focusNeighborColumn(getItem("delete:5"));
        expect(document.activeElement).toBe(getItem("delete:7"));
        focusNeighborColumn(getItem("name:7"));
        expect(document.activeElement).toBe(getItem("name:5"));
    });

    it("falls back to the add button when no column is left", () => {
        document.body.innerHTML = TABLE.replace(
            /<th colspan="2">[\s\S]*?<\/th>/,
            ""
        );
        focusNeighborColumn(getItem("delete:7"));
        expect(document.activeElement).toBe(getItem("add"));
    });
});

describe("getTabKey", () => {
    const ATT = GeneratorTypes.initialAttenuation;
    const SHOWN = {
        zoneIds: [2],
        modulatorZoneIds: [1, 2],
        rows: [{ generator: ATT, zoneIds: [1, 2] }],
        globalZoneId: 1
    };

    it("keeps the last focused item while it is shown", () => {
        expect(getTabKey(`cell:${ATT}:2`, SHOWN)).toBe(`cell:${ATT}:2`);
        expect(getTabKey("name:2", SHOWN)).toBe("name:2");
    });

    it("falls back to the first global cell, or the add button without rows", () => {
        expect(getTabKey("name:9", SHOWN)).toBe(`cell:${ATT}:1`);
        expect(getTabKey(null, { ...SHOWN, rows: [] })).toBe("add");
    });
});
