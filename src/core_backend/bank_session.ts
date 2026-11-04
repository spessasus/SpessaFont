import type { BasicSample, ProgressFunction } from "spessasynth_core";
import { BankMirror } from "../synth_host/bank_mirror.ts";
import { getObjectId } from "../utils/object_id.ts";
import { BankDocument } from "./bank_document.ts";
import { type LoadedBank, loadNewBank } from "./load_sound_bank.ts";
import { MirrorSync } from "./mirror_sync.ts";
import type { SampleDataSource } from "./sample_data_source.ts";
import { BankStore } from "./bank_store.ts";
import { HistoryManager } from "./history.ts";
import { SynthBinding, type SynthHost } from "./synth_binding.ts";
import {
    convertSampleFormat,
    encodeSoundBank,
    getInitialWriteFormat,
    getSaveExtension,
    pickSaveFile,
    resolveWriteFormat,
    type SaveFileHandle,
    type SaveFormat,
    writeFile,
    type WriteFormat
} from "./persistence.ts";
import {
    captureBankFormat,
    ConvertSamplesAction
} from "./convert_samples_action.ts";

let nextSessionId = 1;

/**
 * One open sound bank: the document, its store and history, its synthesizer binding,
 * and where it was last saved.
 */
export class BankSession implements SampleDataSource {
    private saveHandle: SaveFileHandle | undefined;
    private writeFormat: WriteFormat;
    private isClosed = false;
    private readonly unsubscribeSynth: () => void;
    private readonly mirrorSync: MirrorSync;
    public readonly id = nextSessionId++;
    public readonly document: BankDocument;
    public readonly store: BankStore;
    public readonly history: HistoryManager;
    public readonly synth: SynthBinding;
    /**
     * The copy of the bank the synthesizer plays, which follows the store.
     */
    public readonly mirror: BankMirror;

    /**
     * @param synth the shared synthesizer
     * @param loaded the loaded bank and its file, or undefined to start a new one
     */
    public constructor(synth: SynthHost, loaded: LoadedBank = loadNewBank()) {
        const { bank, file } = loaded;
        // The mirror pairs the elements by index, so it is made before the document sorts them
        this.mirror = BankMirror.fromFile(file, {
            presets: bank.presets.map((p) => getObjectId(p)),
            instruments: bank.instruments.map((i) => getObjectId(i)),
            samples: bank.samples.map((s) => getObjectId(s))
        });
        this.document = new BankDocument(bank);
        this.writeFormat = getInitialWriteFormat(this.document.bank);
        this.store = new BankStore(this.document);
        this.mirrorSync = new MirrorSync(
            this.mirror,
            this.document,
            this.store.getSnapshot()
        );
        this.synth = new SynthBinding(synth, this.mirror.bank);
        // Every commit reaches the synthesizer, including ones made outside the history
        this.unsubscribeSynth = this.store.subscribe(() => {
            const diff = this.mirrorSync.update(this.store.getSnapshot());
            if (diff) {
                this.synth.update(diff);
            }
        });
        this.history = new HistoryManager(this.document, this.store);
    }

    private getMirrorSample(sample: BasicSample) {
        const mirrored = this.mirror.getSample(getObjectId(sample));
        if (!mirrored) {
            throw new Error(`The mirror has no sample "${sample.name}".`);
        }
        return mirrored;
    }

    public readAudio(sample: BasicSample) {
        return Promise.resolve(this.getMirrorSample(sample).getAudioData());
    }

    public readStoredData(sample: BasicSample) {
        return Promise.resolve(this.getMirrorSample(sample).getStoredData());
    }

    /**
     * The format a save with this choice writes, "auto" meaning the last one.
     */
    public getWriteFormat(format: SaveFormat) {
        return resolveWriteFormat(format, this.writeFormat);
    }

    /**
     * Saves the bank: asks for the file first, then converts the samples for an explicit SF2 or
     * SF3 save (recorded in the history), encodes, writes, and marks the position as saved.
     * Throws when encoding or writing fails, including when the user cancels the file picker.
     */
    public async save(
        format: SaveFormat,
        unnamed: string,
        progressFunction?: ProgressFunction
    ) {
        const { bank } = this.document;
        const target = this.getWriteFormat(format);
        const extension = getSaveExtension(bank, format, target);
        const name = `${this.document.getBankName(unnamed)}.${extension}`;
        // An "auto" save whose contents no longer match the file (SF3 data for a .sf2 file)
        // asks for a new file instead of writing over the old one
        const isOtherFormat =
            this.saveHandle !== undefined &&
            !this.saveHandle.name.toLowerCase().endsWith(`.${extension}`);
        const handle = await pickSaveFile(
            name,
            this.saveHandle,
            format !== "auto" || isOtherFormat
        );

        const before = captureBankFormat(bank);
        await convertSampleFormat(bank, format, progressFunction);
        const conversion = ConvertSamplesAction.between(bank, before);
        if (conversion) {
            this.history.do([conversion]);
        }
        // Edits made while the file is written are not in it, so they keep the bank dirty
        const savedPosition = this.history.position;
        const binary = encodeSoundBank(bank, target, progressFunction);
        this.saveHandle = await writeFile(binary, name, handle);
        this.writeFormat = target;
        this.history.markSaved(savedPosition);
    }

    /**
     * Releases the bank. Safe to call more than once, for example from two close prompts.
     */
    public close() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.unsubscribeSynth();
        this.synth.detach();
        this.document.bank.destroySoundBank();
        this.mirror.bank.destroySoundBank();
    }
}
