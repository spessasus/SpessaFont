import {
    BasicSoundBank,
    loadSoundFont,
    type ProgressFunction,
    type SoundBankElement,
    type SoundFontInfoType,
    SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import { type HistoryActionGroup, HistoryManager } from "./history.ts";
import { encodeVorbis } from "./encode_vorbis.ts";

export type BankEditView = "info" | SoundBankElement;

const dummy = await BasicSoundBank.getDummySoundfontFile();

export default class SoundBankManager extends BasicSoundBank {
    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    history = new HistoryManager();

    currentView: BankEditView = "info";

    // unsaved changes
    dirty = false;

    constructor(
        processor: SpessaSynthProcessor,
        sequencer: SpessaSynthSequencer,
        bank?: BasicSoundBank
    ) {
        super();
        this.processor = processor;
        this.sequencer = sequencer;
        const actualBank = bank ?? loadSoundFont(dummy.slice());
        this.soundFontInfo = actualBank.soundFontInfo;
        if (bank === undefined) {
            this.soundFontInfo["ifil"] = "2.4";
            this.soundFontInfo["INAM"] = "";
            this.soundFontInfo["ICRD"] = new Date().toISOString().split("T")[0];
        }
        this.addPresets(...actualBank.presets);
        this.addInstruments(...actualBank.instruments);
        this.addSamples(...actualBank.samples);
        this.sortElements();
        this.sendBankToSynth();
    }

    sortElements() {
        this.presets.sort((a, b) => {
            if (a.bank !== b.bank) {
                return a.bank - b.bank;
            }
            return a.program - b.program;
        });
        this.samples.sort((a, b) =>
            a.sampleName > b.sampleName
                ? 1
                : b.sampleName > a.sampleName
                  ? -1
                  : 0
        );
        this.instruments.sort((a, b) =>
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
        return this.soundFontInfo?.[fourCC]?.toString() || "";
    }

    getTabName(unnamed: string) {
        return `${this.dirty ? "* " : ""}${this.getBankName(unnamed)}`;
    }

    clearCache() {
        this.processor.clearCache();
    }

    close() {
        if (
            this.processor.soundfontManager.soundfontList[0].soundfont === this
        ) {
            this.processor.soundfontManager.reloadManager(
                loadSoundFont(dummy.slice())
            );
        }
        this.clearCache();
        this.destroySoundBank();
    }

    async save(
        format: "sf2" | "dls" | "sf3",
        progressFunction: ProgressFunction
    ) {
        let binary: Uint8Array;
        switch (format) {
            default:
            case "sf2":
                binary = await this.write({
                    progressFunction
                });
                break;

            case "dls":
                binary = await this.writeDLS({
                    progressFunction
                });
                break;

            case "sf3":
                binary = await this.write({
                    compress: true,
                    compressionFunction: encodeVorbis,
                    progressFunction
                });
        }
        if (this.soundFontInfo["ifil"] === "3.0") {
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
            console.info("Object URL revoked to free memory");
        }, 10000);
    }

    sendBankToSynth() {
        this.processor.soundfontManager.reloadManager(this);
        this.sequencer.currentTime -= 0.1;
    }

    modifyBank(actions: HistoryActionGroup) {
        if (actions.length === 0) {
            return;
        }
        this.history.do(this, actions);
        this.dirty = true;
        this.changeCallback();
    }

    undo() {
        this.history.undo(this);
        if (this.history.length < 1) {
            this.dirty = false;
        }
        this.changeCallback();
    }

    redo() {
        this.history.redo(this);
        this.dirty = true;
        this.changeCallback();
    }

    changeCallback: () => void = () => {};
}
