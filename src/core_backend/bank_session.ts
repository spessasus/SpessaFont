import type {
    BasicSoundBank,
    ProgressFunction,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { BankDocument } from "./bank_document.ts";
import { BankStore } from "./bank_store.ts";
import { HistoryManager } from "./history.ts";
import { SynthBinding } from "./synth_binding.ts";
import {
    encodeSoundBank,
    getInitialWriteFormat,
    type SaveFormat,
    writeFile,
    type WriteFormat
} from "./persistence.ts";

let nextSessionId = 1;

/**
 * One open sound bank: the document, its store and history, its synthesizer binding,
 * and where it was last saved.
 */
export class BankSession {
    private saveHandle: FileSystemFileHandle | undefined;
    private writeFormat: WriteFormat;
    private isClosed = false;
    public readonly id = nextSessionId++;
    public readonly document: BankDocument;
    public readonly store: BankStore;
    public readonly history: HistoryManager;
    public readonly synth: SynthBinding;

    /**
     * @param processor the shared synthesizer
     * @param sequencer the shared sequencer
     * @param bank the loaded bank, or undefined to start a new one
     */
    public constructor(
        processor: SpessaSynthProcessor,
        sequencer: SpessaSynthSequencer,
        bank?: BasicSoundBank
    ) {
        this.document = bank
            ? new BankDocument(bank)
            : BankDocument.createEmpty();
        this.writeFormat = getInitialWriteFormat(this.document.bank);
        this.store = new BankStore(this.document);
        this.synth = new SynthBinding(processor, sequencer, this.document.bank);
        this.history = new HistoryManager(
            this.document,
            this.store,
            this.synth
        );
    }

    /**
     * Encodes and writes the bank, then marks the current history position as saved.
     * Throws when encoding or writing fails, including when the user cancels the file picker.
     */
    public async save(
        format: SaveFormat,
        unnamed: string,
        progressFunction?: ProgressFunction
    ) {
        const encoded = await encodeSoundBank(
            this.document.bank,
            format,
            this.writeFormat,
            progressFunction
        );
        this.saveHandle = await writeFile(
            encoded.binary,
            `${this.document.getBankName(unnamed)}.${encoded.extension}`,
            this.saveHandle,
            format !== "auto"
        );
        this.writeFormat = encoded.writeFormat;
        this.history.markSaved();
    }

    /**
     * Releases the bank. Safe to call more than once, for example from two close prompts.
     */
    public close() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.synth.detach();
        this.document.bank.destroySoundBank();
    }
}
