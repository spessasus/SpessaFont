import { logInfo } from "../utils/core_utils.ts";
import type SoundBankManager from "./sound_bank_manager.ts";

export interface HistoryAction {
    // do the action
    do(b: SoundBankManager): void;

    // undo the action
    undo(b: SoundBankManager): void;
}

export type HistoryActionGroup = HistoryAction[];

export class HistoryManager {
    history: HistoryActionGroup[] = [];
    undoHistory: HistoryActionGroup[] = [];

    do(m: SoundBankManager, action: HistoryActionGroup) {
        if (action.length === 0) {
            return;
        }
        action.forEach((a) => a.do(m));
        this.history.push(action);
        this.undoHistory.length = 0;
        // update synth engine
        m.clearCache();
    }

    redo(m: SoundBankManager) {
        if (this.undoHistory.length < 1) {
            return;
        }
        const action = this.undoHistory.pop();
        if (!action) {
            return;
        }
        action.forEach((a) => a.do(m));
        logInfo(`Redid. Remaining undo history: ${this.undoHistory.length}`);
        this.history.push(action);
        // update synth engine
        m.clearCache();
    }

    undo(m: SoundBankManager) {
        if (this.history.length < 1) {
            return;
        }
        const action = this.history.pop();

        if (!action) {
            return;
        }

        action.toReversed().forEach((a) => a.undo(m));
        logInfo(`Undid. Remaining history: ${this.history.length}`);
        this.undoHistory.push(action);
        // update synth engine
        m.clearCache();
    }
}
