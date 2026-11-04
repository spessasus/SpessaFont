// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isEditorShortcut } from "./is_editor_shortcut.ts";

function pressOn(target: HTMLElement) {
    document.body.replaceChildren(target.closest("body > *") ?? target);
    let result: boolean | undefined;
    const listener = (e: KeyboardEvent) => {
        result = isEditorShortcut(e);
    };
    document.addEventListener("keydown", listener);
    target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
    );
    document.removeEventListener("keydown", listener);
    return result;
}

describe("isEditorShortcut", () => {
    it("runs shortcuts pressed on the page", () => {
        expect(pressOn(document.createElement("button"))).toBe(true);
    });

    it("leaves keys typed into fields to the field", () => {
        expect(pressOn(document.createElement("input"))).toBe(false);
        expect(pressOn(document.createElement("textarea"))).toBe(false);
        expect(pressOn(document.createElement("select"))).toBe(false);
    });

    it("leaves keys pressed in a dialog or a toast question to it", () => {
        const dialog = document.createElement("dialog");
        const insideDialog = document.createElement("button");
        dialog.append(insideDialog);
        document.body.append(dialog);
        expect(pressOn(insideDialog)).toBe(false);

        const toast = document.createElement("div");
        toast.setAttribute("role", "alertdialog");
        const insideToast = document.createElement("button");
        toast.append(insideToast);
        document.body.append(toast);
        expect(pressOn(insideToast)).toBe(false);
    });
});
