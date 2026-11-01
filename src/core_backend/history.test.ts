import { describe, expect, it, vi } from "vitest";
import { type HistoryAction, HistoryManager } from "./history.ts";
import { createTestManager } from "../test_utils/bank_fixture.ts";

/**
 * An action that only records when it runs, so tests can check ordering.
 */
function recordingAction(name: string, log: string[]): HistoryAction {
    return {
        do: () => {
            log.push(`do ${name}`);
        },
        undo: () => {
            log.push(`undo ${name}`);
        }
    };
}

describe("HistoryManager", () => {
    it("runs a group in order, records it and clears the synth cache once", () => {
        const manager = createTestManager();
        const clearCache = vi.spyOn(manager, "clearCache");
        const history = new HistoryManager();
        const log = new Array<string>();

        history.do(manager, [
            recordingAction("a", log),
            recordingAction("b", log)
        ]);

        expect(log).toEqual(["do a", "do b"]);
        expect(history.length).toBe(1);
        expect(clearCache).toHaveBeenCalledTimes(1);
    });

    it("ignores an empty group", () => {
        const manager = createTestManager();
        const clearCache = vi.spyOn(manager, "clearCache");
        const history = new HistoryManager();

        history.do(manager, []);

        expect(history.length).toBe(0);
        expect(clearCache).not.toHaveBeenCalled();
    });

    it("undoes a group in reverse order and redoes it in the original order", () => {
        const manager = createTestManager();
        const history = new HistoryManager();
        const log = new Array<string>();
        history.do(manager, [
            recordingAction("a", log),
            recordingAction("b", log)
        ]);
        log.length = 0;

        history.undo(manager);
        expect(log).toEqual(["undo b", "undo a"]);
        expect(history.length).toBe(0);
        expect(history.undoLength).toBe(1);

        log.length = 0;
        history.redo(manager);
        expect(log).toEqual(["do a", "do b"]);
        expect(history.length).toBe(1);
        expect(history.undoLength).toBe(0);
    });

    it("discards the redo stack when a new group is done", () => {
        const manager = createTestManager();
        const history = new HistoryManager();
        const log = new Array<string>();
        history.do(manager, [recordingAction("a", log)]);
        history.undo(manager);

        history.do(manager, [recordingAction("b", log)]);

        expect(history.undoLength).toBe(0);
        log.length = 0;
        history.redo(manager);
        expect(log).toEqual([]);
    });

    it("does nothing when there is nothing to undo or redo", () => {
        const manager = createTestManager();
        const clearCache = vi.spyOn(manager, "clearCache");
        const history = new HistoryManager();

        history.undo(manager);
        history.redo(manager);

        expect(clearCache).not.toHaveBeenCalled();
    });
});

describe("SoundBankManager dirty flag", () => {
    it("is set by an edit and notifies the change callback", () => {
        const manager = createTestManager();
        const changeCallback = vi.fn();
        manager.changeCallback = changeCallback;

        manager.modifyBank([recordingAction("a", [])]);

        expect(manager.dirty).toBe(true);
        expect(changeCallback).toHaveBeenCalledTimes(1);
    });

    it("is cleared by undoing back to the opened file and set again by redo", () => {
        const manager = createTestManager();
        manager.modifyBank([recordingAction("a", [])]);

        manager.undo();
        expect(manager.dirty).toBe(false);

        manager.redo();
        expect(manager.dirty).toBe(true);
    });

    // Known bug, fixed in REFACTOR_PLAN.md phase 2 by tracking the saved history position.
    // Saving is simulated by clearing the flag, which is what save() does after writing.
    it.fails("stays dirty when undoing past the last save", () => {
        const manager = createTestManager();
        manager.modifyBank([recordingAction("a", [])]);
        manager.dirty = false;

        manager.undo();

        expect(manager.dirty).toBe(true);
    });

    it.fails("is clean when undoing back to the last save", () => {
        const manager = createTestManager();
        manager.modifyBank([recordingAction("a", [])]);
        manager.dirty = false;
        manager.modifyBank([recordingAction("b", [])]);

        manager.undo();

        expect(manager.dirty).toBe(false);
    });
});
