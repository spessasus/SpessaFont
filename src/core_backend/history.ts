import { logInfo } from "../utils/core_utils.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankStore, HistoryState } from "./bank_store.ts";
import { ChangeSet } from "./change_set.ts";
import type { BankEditView } from "./bank_view.ts";
import type { HistoryLabel } from "./history_label.ts";

/**
 * One undoable edit. Actions mutate the document and record what they touched in the change set.
 * They never talk to React or the synthesizer.
 */
export interface HistoryAction {
    /**
     * A group is named after its last action, the one that finishes it (a paste ends with the
     * presets, after their instruments and samples).
     */
    readonly label: HistoryLabel;

    do(document: BankDocument, changes: ChangeSet): void;

    undo(document: BankDocument, changes: ChangeSet): void;
}

export type HistoryActionGroup = HistoryAction[];

/**
 * How close groups with the same merge key must follow each other to become one undo step.
 */
export const MERGE_WINDOW_MS = 500;

/**
 * Runs, undoes and redoes groups of actions on one document,
 * then publishes the changes to the store once per group.
 */
export class HistoryManager {
    private readonly document: BankDocument;
    private readonly store: BankStore;
    private readonly done = new Array<HistoryActionGroup>();
    private readonly undone = new Array<HistoryActionGroup>();

    /**
     * The `done` length at the last save. Undefined when that state can no longer be reached.
     */
    private savedPosition: number | undefined = 0;

    /**
     * The merge key of the last group and when it ran, so quick repeats (wheel notches on one
     * cell) can join it.
     */
    private lastMerge: { key: string; time: number } | undefined;

    public constructor(document: BankDocument, store: BankStore) {
        this.document = document;
        this.store = store;
    }

    private run(group: HistoryActionGroup, changes: ChangeSet) {
        const completed = new Array<HistoryAction>();
        try {
            for (const action of group) {
                action.do(this.document, changes);
                completed.push(action);
            }
        } catch (error) {
            const rollback = new ChangeSet();
            for (const action of completed.toReversed()) {
                action.undo(this.document, rollback);
            }
            this.commit(rollback);
            throw error;
        }
    }

    private commit(changes: ChangeSet) {
        this.store.commit(changes, this.state);
    }

    /**
     * Picks what the UI should show after a group ran: the last focus hint still in the bank,
     * or the first one for an undo (the hint of the action the group is named after). Undo and
     * redo with no hint show what they changed, as it may not be the shown element.
     */
    private findFocus(changes: ChangeSet, step: "do" | "undo" | "redo") {
        let elements: Set<BankEditView> | undefined;
        const isInBank = (view: BankEditView) => {
            const { presets, instruments, samples } = this.document;
            elements ??= new Set<BankEditView>([
                ...presets,
                ...instruments,
                ...samples
            ]);
            return view === "info" || elements.has(view);
        };
        const hints =
            step === "undo"
                ? changes.focusHints
                : changes.focusHints.toReversed();
        const hint = hints.find((view) => isInBank(view));
        if (hint !== undefined || step === "do") {
            return hint;
        }
        for (const entity of changes.entities) {
            if (isInBank(entity)) {
                return entity;
            }
        }
        return changes.hasBankInfoChanged || changes.hasFormatChanged
            ? "info"
            : undefined;
    }

    public get canUndo() {
        return this.done.length > 0;
    }

    public get canRedo() {
        return this.undone.length > 0;
    }

    public get isDirty() {
        return this.done.length !== this.savedPosition;
    }

    public get state(): HistoryState {
        return {
            canUndo: this.canUndo,
            canRedo: this.canRedo,
            isDirty: this.isDirty,
            undoLabel: this.done.at(-1)?.at(-1)?.label,
            redoLabel: this.undone.at(-1)?.at(-1)?.label
        };
    }

    /**
     * Runs a new group and records it. Returns the focus hint of the group, if any.
     * If an action throws, the actions already run are undone and the error is rethrown.
     * @param group the actions
     * @param mergeKey a group with the same key as the last one, run within `MERGE_WINDOW_MS`
     * of it, joins it as one undo step. The saved state never merges, so the dirty flag stays
     * right.
     */
    public do(group: HistoryActionGroup, mergeKey?: string) {
        if (group.length === 0) {
            return;
        }
        const changes = new ChangeSet();
        this.run(group, changes);
        const now = Date.now();
        const last = this.done.at(-1);
        const canMerge =
            mergeKey !== undefined &&
            last !== undefined &&
            this.lastMerge?.key === mergeKey &&
            now - this.lastMerge.time < MERGE_WINDOW_MS &&
            this.savedPosition !== this.done.length;
        this.lastMerge =
            mergeKey === undefined ? undefined : { key: mergeKey, time: now };
        if (canMerge) {
            last.push(...group);
            this.commit(changes);
            return this.findFocus(changes, "do");
        }
        if (
            this.savedPosition !== undefined &&
            this.savedPosition > this.done.length
        ) {
            this.savedPosition = undefined;
        }
        this.done.push(group);
        this.undone.length = 0;
        this.commit(changes);
        return this.findFocus(changes, "do");
    }

    /**
     * Undoes the last group and returns what the UI should show. If an action throws, the part
     * already undone is done again and the group stays in the history, so the bank is not left
     * half undone and nothing is lost.
     */
    public undo() {
        this.lastMerge = undefined;
        const group = this.done.pop();
        if (!group) {
            return;
        }
        const changes = new ChangeSet();
        const undone = new Array<HistoryAction>();
        try {
            for (const action of group.toReversed()) {
                action.undo(this.document, changes);
                undone.push(action);
            }
        } catch (error) {
            for (const action of undone.toReversed()) {
                action.do(this.document, changes);
            }
            this.done.push(group);
            this.commit(changes);
            throw error;
        }
        this.undone.push(group);
        logInfo(`Undid. Remaining history: ${this.done.length}`);
        this.commit(changes);
        return this.findFocus(changes, "undo");
    }

    /**
     * Redoes the last undone group and returns what the UI should show.
     */
    public redo() {
        this.lastMerge = undefined;
        const group = this.undone.at(-1);
        if (!group) {
            return;
        }
        const changes = new ChangeSet();
        // The group stays on the redo stack while it runs, so if it throws, the state that run
        // publishes with its rollback still offers to redo it
        this.run(group, changes);
        this.undone.pop();
        this.done.push(group);
        logInfo(`Redid. Remaining undo history: ${this.undone.length}`);
        this.commit(changes);
        return this.findFocus(changes, "redo");
    }

    /**
     * The history position, for `markSaved`.
     */
    public get position() {
        return this.done.length;
    }

    /**
     * Records the position as the saved file contents.
     * @param position the position when the file was encoded, the current one by default
     */
    public markSaved(position = this.done.length) {
        this.savedPosition = position;
        this.lastMerge = undefined;
        this.store.commit(new ChangeSet(), this.state);
    }
}
