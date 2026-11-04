import { logInfo } from "../utils/core_utils.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankStore, HistoryState } from "./bank_store.ts";
import { ChangeSet } from "./change_set.ts";

/**
 * One undoable edit. Actions mutate the document and record what they touched in the change set.
 * They never talk to React or the synthesizer.
 */
export interface HistoryAction {
    do(document: BankDocument, changes: ChangeSet): void;

    undo(document: BankDocument, changes: ChangeSet): void;
}

export type HistoryActionGroup = HistoryAction[];

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
        return changes.focus;
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
            isDirty: this.isDirty
        };
    }

    /**
     * Runs a new group and records it. Returns the focus hint of the group, if any.
     * If an action throws, the actions already run are undone and the error is rethrown.
     */
    public do(group: HistoryActionGroup) {
        if (group.length === 0) {
            return;
        }
        const changes = new ChangeSet();
        this.run(group, changes);
        if (
            this.savedPosition !== undefined &&
            this.savedPosition > this.done.length
        ) {
            this.savedPosition = undefined;
        }
        this.done.push(group);
        this.undone.length = 0;
        return this.commit(changes);
    }

    /**
     * Undoes the last group. If an action throws, the part already undone is done again and the
     * group stays in the history, so the bank is not left half undone and nothing is lost.
     */
    public undo() {
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
        return this.commit(changes);
    }

    public redo() {
        const group = this.undone.pop();
        if (!group) {
            return;
        }
        const changes = new ChangeSet();
        try {
            this.run(group, changes);
        } catch (error) {
            // run already rolled the group back, so it can be redone again later
            this.undone.push(group);
            throw error;
        }
        this.done.push(group);
        logInfo(`Redid. Remaining undo history: ${this.undone.length}`);
        return this.commit(changes);
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
        this.store.commit(new ChangeSet(), this.state);
    }
}
