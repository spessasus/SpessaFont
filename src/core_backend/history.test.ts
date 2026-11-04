import { describe, expect, it, vi } from "vitest";
import type { HistoryAction } from "./history.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";

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

function failingAction(): HistoryAction {
    return {
        do: () => {
            throw new Error("Failed on purpose.");
        },
        undo: () => undefined
    };
}

describe("HistoryManager", () => {
    it("runs a group in order, records it and clears the synth cache once", () => {
        const session = createTestSession();
        const clearCache = vi.spyOn(session.synth, "clearCache");
        const log = new Array<string>();

        session.history.do([
            recordingAction("a", log),
            recordingAction("b", log)
        ]);

        expect(log).toEqual(["do a", "do b"]);
        expect(session.history.canUndo).toBe(true);
        expect(clearCache).toHaveBeenCalledTimes(1);
    });

    it("ignores an empty group", () => {
        const session = createTestSession();
        const clearCache = vi.spyOn(session.synth, "clearCache");

        session.history.do([]);

        expect(session.history.canUndo).toBe(false);
        expect(clearCache).not.toHaveBeenCalled();
    });

    it("undoes a group in reverse order and redoes it in the original order", () => {
        const session = createTestSession();
        const log = new Array<string>();
        session.history.do([
            recordingAction("a", log),
            recordingAction("b", log)
        ]);
        log.length = 0;

        session.history.undo();
        expect(log).toEqual(["undo b", "undo a"]);
        expect(session.history.canUndo).toBe(false);
        expect(session.history.canRedo).toBe(true);

        log.length = 0;
        session.history.redo();
        expect(log).toEqual(["do a", "do b"]);
        expect(session.history.canUndo).toBe(true);
        expect(session.history.canRedo).toBe(false);
    });

    it("discards the redo stack when a new group is done", () => {
        const session = createTestSession();
        const log = new Array<string>();
        session.history.do([recordingAction("a", log)]);
        session.history.undo();

        session.history.do([recordingAction("b", log)]);

        expect(session.history.canRedo).toBe(false);
        log.length = 0;
        session.history.redo();
        expect(log).toEqual([]);
    });

    it("does nothing when there is nothing to undo or redo", () => {
        const session = createTestSession();
        const clearCache = vi.spyOn(session.synth, "clearCache");

        expect(session.history.undo()).toBeUndefined();
        expect(session.history.redo()).toBeUndefined();

        expect(clearCache).not.toHaveBeenCalled();
    });

    it("undoes the completed actions of a failing group and does not record it", () => {
        const session = createTestSession();
        const log = new Array<string>();

        expect(() =>
            session.history.do([recordingAction("a", log), failingAction()])
        ).toThrow("Failed on purpose.");

        expect(log).toEqual(["do a", "undo a"]);
        expect(session.history.canUndo).toBe(false);
    });
});

describe("HistoryManager dirty state", () => {
    it("is set by an edit and published to the store", () => {
        const session = createTestSession();
        const listener = vi.fn();
        session.store.subscribe(listener);

        session.history.do([recordingAction("a", [])]);

        expect(session.history.isDirty).toBe(true);
        expect(session.store.getSnapshot().history.isDirty).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("is cleared by undoing back to the opened file and set again by redo", () => {
        const session = createTestSession();
        session.history.do([recordingAction("a", [])]);

        session.history.undo();
        expect(session.history.isDirty).toBe(false);

        session.history.redo();
        expect(session.history.isDirty).toBe(true);
    });

    it("stays dirty when undoing past the last save", () => {
        const session = createTestSession();
        session.history.do([recordingAction("a", [])]);
        session.history.markSaved();
        expect(session.history.isDirty).toBe(false);

        session.history.undo();

        expect(session.history.isDirty).toBe(true);
    });

    it("is clean when undoing back to the last save", () => {
        const session = createTestSession();
        session.history.do([recordingAction("a", [])]);
        session.history.markSaved();
        session.history.do([recordingAction("b", [])]);

        session.history.undo();

        expect(session.history.isDirty).toBe(false);
    });

    it("stays dirty for good once the saved state is discarded from the redo stack", () => {
        const session = createTestSession();
        session.history.do([recordingAction("a", [])]);
        session.history.markSaved();
        session.history.undo();
        session.history.do([recordingAction("b", [])]);

        session.history.undo();

        expect(session.history.isDirty).toBe(true);
    });

    it("keeps a group whose undo throws and does again what it had undone", () => {
        const session = createTestSession();
        const log = new Array<string>();
        const failingUndo: HistoryAction = {
            do: () => {
                log.push("do bad");
            },
            undo: () => {
                throw new Error("Failed on purpose.");
            }
        };
        session.history.do([failingUndo, recordingAction("b", log)]);
        log.length = 0;

        expect(() => session.history.undo()).toThrow("Failed on purpose.");

        expect(log).toEqual(["undo b", "do b"]);
        expect(session.history.canUndo).toBe(true);
        expect(session.history.canRedo).toBe(false);
    });

    it("keeps a group whose redo throws on the redo stack", () => {
        const session = createTestSession();
        let shouldFail = false;
        const flaky: HistoryAction = {
            do: () => {
                if (shouldFail) throw new Error("Failed on purpose.");
            },
            undo: () => undefined
        };
        session.history.do([flaky]);
        session.history.undo();
        shouldFail = true;

        expect(() => session.history.redo()).toThrow("Failed on purpose.");

        expect(session.history.canRedo).toBe(true);
        expect(session.history.canUndo).toBe(false);
    });
});
