import {
    BasicSoundBank,
    loadSoundFont,
    type SoundFontInfoType,
    SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import { type HistoryAction, HistoryManager } from "./history.ts";

export default class SoundBankManager {
    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    history = new HistoryManager();

    bank: BasicSoundBank;
    // unsaved changes
    dirty = false;

    constructor(
        processor: SpessaSynthProcessor,
        sequencer: SpessaSynthSequencer,
        bank?: BasicSoundBank
    ) {
        this.processor = processor;
        this.sequencer = sequencer;
        if (!bank) {
            this.bank = loadSoundFont(BasicSoundBank.getDummySoundfontFile());
            this.bank.soundFontInfo["INAM"] = "";
        } else {
            this.bank = bank;
        }
        this.sendBankToSynth();
    }

    getBankName(unnamed: string) {
        return this.getInfo("INAM") || unnamed;
    }

    getInfo(fourCC: SoundFontInfoType) {
        return this.bank.soundFontInfo?.[fourCC]?.toString() || "";
    }

    getTabName(unnamed: string) {
        return `${this.dirty ? "* " : ""}${this.getBankName(unnamed)}`;
    }

    clearCache() {
        this.processor.clearCache();
    }

    close() {
        this.bank.destroySoundBank();
        this.clearCache();
    }

    save(format: "sf2" | "dls") {
        if (this.bank === undefined) {
            return;
        }
        let binary: Uint8Array;
        switch (format) {
            case "sf2":
                binary = this.bank.write();
                break;

            case "dls":
                binary = this.bank.writeDLS();
                break;
        }
        const blob = new Blob([binary.buffer]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.getBankName("Unnamed")}.${format}`;
        console.log(a);
        a.click();
        this.dirty = false;
        this.changeCallback();
    }

    sendBankToSynth() {
        this.processor.soundfontManager.reloadManager(this.bank);
        this.sequencer.currentTime -= 0.1;
    }

    modifyBank(action: HistoryAction) {
        this.history.do(this, action);
        this.dirty = true;
        this.changeCallback();
    }

    undo() {
        this.history.undo(this);
        this.changeCallback();
    }

    redo() {
        this.history.redo(this);
        this.changeCallback();
    }

    changeCallback: () => void = () => {};
}
