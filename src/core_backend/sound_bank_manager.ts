import {
    BasicSoundBank,
    loadSoundFont,
    type SoundBankElement,
    type SoundFontInfoType,
    SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import { type HistoryActionGroup, HistoryManager } from "./history.ts";
import { encodeVorbis } from "../externals/libvorbis/encode_vorbis";

export type BankEditView = "info" | SoundBankElement;

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
        if (
            this.processor.soundfontManager.soundfontList[0].soundfont ===
            this.bank
        ) {
            this.processor.soundfontManager.reloadManager(
                loadSoundFont(BasicSoundBank.getDummySoundfontFile())
            );
        }
        this.clearCache();
        this.bank.destroySoundBank();
    }

    save(format: "sf2" | "dls" | "sf3") {
        if (this.bank === undefined) {
            return;
        }
        let binary: Uint8Array;
        switch (format) {
            default:
            case "sf2":
                binary = this.bank.write();
                break;

            case "dls":
                binary = this.bank.writeDLS();
                break;

            case "sf3":
                binary = this.bank.write({
                    compress: true,
                    compressionQuality: 1,
                    compressionFunction: encodeVorbis
                });
        }
        if (this.bank.soundFontInfo["ifil"] === "3.0") {
            format = "sf3";
        }
        const buffer = binary.buffer;
        const chunks: ArrayBuffer[] = [];
        let toWrite = 0;
        while (toWrite < binary.length) {
            // 50MB chunks (browsers don't like 4GB array buffers)
            const size = Math.min(52428800, binary.length - toWrite);
            chunks.push(buffer.slice(toWrite, toWrite + size) as ArrayBuffer);
            toWrite += size;
        }

        const blob = new Blob(chunks);
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `${this.getBankName("Unnamed")}.${format}`;
        a.click();
        this.dirty = false;
        this.changeCallback();

        // clean up the object URL after a short delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.info("Object URL revoked to free memory.");
        }, 10000);
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
