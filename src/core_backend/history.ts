import type { BasicSoundBank } from "spessasynth_core";

export interface HistoryAction {
    // do the action
    do(b: BasicSoundBank): void;

    // undo the action
    undo(b: BasicSoundBank): void;
}
