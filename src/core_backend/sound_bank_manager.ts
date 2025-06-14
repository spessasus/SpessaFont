import {
    type BasicInstrument,
    type BasicPreset,
    type BasicSample,
    BasicSoundBank,
    loadSoundFont,
    type SoundFontInfoType,
    SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import { type HistoryActionGroup, HistoryManager } from "./history.ts";

export type BankEditView = "info" | BasicSample | BasicPreset | BasicInstrument;

export default class SoundBankManager {
    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    history = new HistoryManager();

    currentView: BankEditView = "info";

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
            this.bank.soundFontInfo["ICRD"] = new Date()
                .toISOString()
                .split("T")[0];
        } else {
            this.bank = bank;
        }
        this.sortElements();
        this.sendBankToSynth();
    }

    sortElements() {
        this.bank.presets.sort((a, b) => {
            if (a.bank !== b.bank) {
                return a.bank - b.bank;
            }
            return a.program - b.program;
        });
        this.bank.samples.sort((a, b) =>
            a.sampleName > b.sampleName
                ? 1
                : b.sampleName > a.sampleName
                  ? -1
                  : 0
        );
        this.bank.instruments.sort((a, b) =>
            a.instrumentName > b.instrumentName
                ? 1
                : b.instrumentName > a.instrumentName
                  ? -1
                  : 0
        );
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
        const blob = new Blob([binary.buffer as ArrayBuffer]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.getBankName("Unnamed")}.${format}`;
        console.info(a);
        a.click();
        this.dirty = false;
        this.changeCallback();
    }

    sendBankToSynth() {
        this.processor.soundfontManager.reloadManager(this.bank);
        this.sequencer.currentTime -= 0.1;
    }

    modifyBank(action: HistoryActionGroup) {
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
