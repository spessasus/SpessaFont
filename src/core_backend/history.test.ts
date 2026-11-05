import { afterEach, describe, expect, it, vi } from "vitest";
import { BasicPreset, EmptySample, GeneratorTypes } from "spessasynth_core";
import { type HistoryAction, MERGE_WINDOW_MS } from "./history.ts";
import {
    createTestHost,
    createTestSession
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { ClipboardManager } from "./clipboard_manager.ts";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";

/**
 * An action that only records when it runs, so tests can check ordering.
 */
function recordingAction(name: string, log: string[]): HistoryAction {
    return {
        label: "editSample",
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
        label: "editSample",
        do: () => {
            throw new Error("Failed on purpose.");
        },
        undo: () => undefined
    };
}

describe("HistoryManager", () => {
    it("runs a group in order, records it and publishes it once", () => {
        const session = createTestSession();
        const commit = vi.spyOn(session.store, "commit");
        const log = new Array<string>();

        session.history.do([
            recordingAction("a", log),
            recordingAction("b", log)
        ]);

        expect(log).toEqual(["do a", "do b"]);
        expect(session.history.canUndo).toBe(true);
        expect(commit).toHaveBeenCalledTimes(1);
    });

    it("ignores an empty group", () => {
        const session = createTestSession();
        const commit = vi.spyOn(session.store, "commit");

        session.history.do([]);

        expect(session.history.canUndo).toBe(false);
        expect(commit).not.toHaveBeenCalled();
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
        const commit = vi.spyOn(session.store, "commit");

        expect(session.history.undo()).toBeUndefined();
        expect(session.history.redo()).toBeUndefined();

        expect(commit).not.toHaveBeenCalled();
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
            label: "editSample",
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
            label: "editSample",
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
        // The rollback published the state too, which the Edit menu reads
        expect(session.store.getSnapshot().history).toMatchObject({
            canRedo: true,
            canUndo: false,
            redoLabel: "editSample"
        });
    });

    describe("merging", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("joins quick groups with the same key into one undo step", () => {
            vi.useFakeTimers();
            const session = createTestSession();
            const log = new Array<string>();

            session.history.do([recordingAction("a", log)], "wheel");
            vi.advanceTimersByTime(MERGE_WINDOW_MS - 100);
            session.history.do([recordingAction("b", log)], "wheel");
            session.history.undo();

            expect(log).toEqual(["do a", "do b", "undo b", "undo a"]);
            expect(session.history.canUndo).toBe(false);
        });

        it("keeps groups apart after a pause, another key or a save", () => {
            vi.useFakeTimers();
            const session = createTestSession();
            const log = new Array<string>();

            session.history.do([recordingAction("a", log)], "wheel");
            vi.advanceTimersByTime(MERGE_WINDOW_MS);
            session.history.do([recordingAction("b", log)], "wheel");
            session.history.do([recordingAction("c", log)], "other");
            session.history.markSaved();
            session.history.do([recordingAction("d", log)], "other");
            log.length = 0;
            session.history.undo();

            expect(log).toEqual(["undo d"]);
            expect(session.history.isDirty).toBe(false);
            session.history.undo();
            session.history.undo();
            expect(log).toEqual(["undo d", "undo c", "undo b"]);
        });
    });
});

describe("HistoryManager labels", () => {
    it("names the next undo and redo in the store's history state", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const history = () => session.store.getSnapshot().history;

        session.history.do([
            new EditSampleAction(sample, "name", sample.name, "Renamed")
        ]);
        expect(history().undoLabel).toBe("renameSample");
        session.history.do([
            new EditSampleAction(sample, "loopStart", sample.loopStart, 1)
        ]);
        expect(history().undoLabel).toBe("editSample");

        session.history.undo();
        expect(history()).toMatchObject({
            undoLabel: "renameSample",
            redoLabel: "editSample"
        });
    });
});

describe("HistoryManager focus", () => {
    it("shows the pasted presets' neighbor when a paste into another bank is undone", () => {
        const host = createTestHost();
        const source = createTestSession(host);
        const target = createTestSession(host);
        const clipboard = new ClipboardManager();
        clipboard.copyPresets(new Set([source.document.presets[0]]), source);

        const doFocus = target.history.do(clipboard.pastePresets(target));
        expect(doFocus).toBeInstanceOf(BasicPreset);
        const index = target.document.presets.findIndex((p) => p === doFocus);

        // Not the first sample, which the paste's first action would point to
        const undoFocus = target.history.undo();
        expect(undoFocus).toBe(target.document.presets[Math.max(index - 1, 0)]);
        expect(target.history.redo()).toBe(doFocus);
    });

    it("skips hints to elements the rest of the group removed", () => {
        const session = createTestSession();
        const last = session.document.samples.at(-1);
        const [first, second] = ["Zz 1", "Zz 2"].map((name) => {
            const sample = new EmptySample();
            sample.name = name;
            return sample;
        });
        session.history.do([
            new CreateSampleAction(first),
            new CreateSampleAction(second)
        ]);

        // Undoing the second one points to the first, which is removed right after
        expect(session.history.undo()).toBe(last);
    });

    it("shows the element an undo or redo changed when no action points to one", () => {
        const session = createTestSession();
        const [instrument, other] = session.document.instruments;
        const zone = instrument.zones[0];
        const action = new SetGeneratorAction(
            instrument,
            zone,
            GeneratorTypes.pan,
            null,
            100
        );
        // An edit happens in the shown editor, so it moves nothing
        expect(session.history.do([action])).toBeUndefined();

        expect(other).toBeDefined();
        expect(session.history.undo()).toBe(instrument);
        expect(session.history.redo()).toBe(instrument);
    });

    it("shows the overview when an undo changed the bank info", () => {
        const session = createTestSession();
        session.history.do([new SetBankInfoAction("name", "", "Named")]);

        expect(session.history.undo()).toBe("info");
    });
});
