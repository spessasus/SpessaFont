// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
    ELEMENT_LIST_SCOPE,
    isEditorShortcut,
    isListShortcut
} from "./is_editor_shortcut.ts";

function press(target: EventTarget, isShortcut: (e: KeyboardEvent) => boolean) {
    let result: boolean | undefined;
    const listener = (e: KeyboardEvent) => {
        result = isShortcut(e);
    };
    document.addEventListener("keydown", listener);
    target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
    );
    document.removeEventListener("keydown", listener);
    return result;
}

function pressOn(target: HTMLElement, isShortcut = isEditorShortcut) {
    document.body.replaceChildren(target.closest("body > *") ?? target);
    return press(target, isShortcut);
}

function input(type: string) {
    return Object.assign(document.createElement("input"), { type });
}

function inElementList(child: HTMLElement) {
    const list = document.createElement("div");
    for (const [name, value] of Object.entries(ELEMENT_LIST_SCOPE)) {
        list.setAttribute(name, value);
    }
    list.append(child);
    document.body.replaceChildren(list);
    return child;
}

describe("isEditorShortcut", () => {
    it("runs shortcuts pressed on the page", () => {
        expect(pressOn(document.createElement("button"))).toBe(true);
        expect(press(document.body, isEditorShortcut)).toBe(true);
    });

    it("leaves keys typed into text fields to the field", () => {
        expect(pressOn(input("text"))).toBe(false);
        expect(pressOn(input("search"))).toBe(false);
        expect(pressOn(input("number"))).toBe(false);
        expect(pressOn(document.createElement("textarea"))).toBe(false);
    });

    it("runs shortcuts pressed on a read-only field", () => {
        const cell = document.createElement("input");
        cell.readOnly = true;
        expect(pressOn(cell)).toBe(true);
    });

    it("gives undo to controls without an undo of their own", () => {
        expect(pressOn(document.createElement("select"))).toBe(true);
        expect(pressOn(input("range"))).toBe(true);
        expect(pressOn(input("checkbox"))).toBe(true);
    });

    it("leaves keys pressed in a dialog, a toast question or a menu to it", () => {
        for (const make of [
            () => document.createElement("dialog"),
            () => {
                const toast = document.createElement("div");
                toast.setAttribute("role", "alertdialog");
                return toast;
            },
            () => {
                const menu = document.createElement("div");
                menu.setAttribute("role", "menu");
                return menu;
            }
        ]) {
            const container = make();
            const inside = document.createElement("button");
            container.append(inside);
            document.body.replaceChildren(container);
            expect(press(inside, isEditorShortcut)).toBe(false);
        }
    });
});

describe("isListShortcut", () => {
    it("runs with the focus on nothing", () => {
        document.body.replaceChildren();
        expect(press(document.body, isListShortcut)).toBe(true);
    });

    it("runs with the focus in the element list", () => {
        const row = inElementList(document.createElement("button"));
        expect(press(row, isListShortcut)).toBe(true);
    });

    it("leaves the list's search field alone", () => {
        const search = inElementList(input("text"));
        expect(press(search, isListShortcut)).toBe(false);
    });

    it("does not run in the editors", () => {
        // A zone header, a modulator's number or a select cell
        expect(pressOn(document.createElement("button"), isListShortcut)).toBe(
            false
        );
        expect(pressOn(document.createElement("select"), isListShortcut)).toBe(
            false
        );
    });
});
