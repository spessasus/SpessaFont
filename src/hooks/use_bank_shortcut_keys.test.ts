// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBankShortcutKeys } from "./use_bank_shortcut_keys.ts";

function setUp(isEditorCovered = false, hasSession = true) {
    const commands = { undo: vi.fn(), redo: vi.fn(), save: vi.fn() };
    renderHook(() =>
        useBankShortcutKeys(hasSession, commands, isEditorCovered)
    );
    return commands;
}

function press(key: string, init: KeyboardEventInit = {}, target?: Element) {
    const event = new KeyboardEvent("keydown", {
        key,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
        ...init
    });
    (target ?? document.body).dispatchEvent(event);
    return event;
}

describe("useBankShortcutKeys", () => {
    afterEach(cleanup);

    it("undoes on Ctrl+Z and redoes on Ctrl+Y and Ctrl+Shift+Z", () => {
        const commands = setUp();
        expect(press("z").defaultPrevented).toBe(true);
        press("y");
        press("Z", { shiftKey: true });
        expect(commands.undo).toHaveBeenCalledTimes(1);
        expect(commands.redo).toHaveBeenCalledTimes(2);
    });

    it("saves automatically on Ctrl+S, and not on a repeat", () => {
        const commands = setUp();
        press("s");
        press("s", { repeat: true });
        expect(commands.save).toHaveBeenCalledTimes(1);
        expect(commands.save).toHaveBeenCalledWith("auto");
    });

    it("leaves text fields to themselves", () => {
        const commands = setUp();
        const input = document.createElement("input");
        document.body.append(input);
        press("z", {}, input);
        expect(commands.undo).not.toHaveBeenCalled();
        input.remove();
    });

    it("does not undo while the editor is covered but still saves", () => {
        const commands = setUp(true);
        press("z");
        press("s");
        expect(commands.undo).not.toHaveBeenCalled();
        expect(commands.save).toHaveBeenCalledTimes(1);
    });

    it("does nothing without a bank, but keeps the browser from saving the page", () => {
        const commands = setUp(false, false);
        expect(press("s").defaultPrevented).toBe(true);
        press("z");
        expect(commands.save).not.toHaveBeenCalled();
        expect(commands.undo).not.toHaveBeenCalled();
    });
});
