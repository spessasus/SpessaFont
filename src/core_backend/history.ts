import type { BasicSoundBank } from "spessasynth_core";
import { logInfo } from "../utils/core_utils.ts";
import type SoundBankManager from "./sound_bank_manager.ts";

export interface HistoryAction {
    // do the action
    do(b: BasicSoundBank): void;

    // undo the action
    undo(b: BasicSoundBank): void;
}

export class HistoryManager {
    history: HistoryAction[] = [];
    undoHistory: HistoryAction[] = [];

    do(m: SoundBankManager, action: HistoryAction) {
        if (!m.bank) {
            return;
        }
        action.do(m.bank);
        this.history.push(action);
        this.undoHistory.length = 0;
        // update synth engine
        m.clearCache();
    }

    redo(m: SoundBankManager) {
        if (!m.bank || this.undoHistory.length < 1) {
            return;
        }
        const action = this.undoHistory.pop();
        if (!action) {
            return;
        }
        action.do(m.bank);
        logInfo(`Redid. Remaining undo history: ${this.undoHistory.length}`);
        this.history.push(action);
        // update synth engine
        m.clearCache();
    }

    undo(m: SoundBankManager) {
        if (!m.bank || this.history.length < 1) {
            return;
        }
        const action = this.history.pop();

        if (!action) {
            return;
        }

        action.undo(m.bank);
        logInfo(`Undid. Remaining history: ${this.history.length}`);
        this.undoHistory.push(action);
        // update synth engine
        m.clearCache();
    }
}
