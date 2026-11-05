import type { BasicSample, ProgressFunction } from "spessasynth_core";
import { getObjectId } from "../utils/object_id.ts";
import { SOFTWARE_NAME } from "../utils/software_name.ts";
import type { MirrorTarget } from "../synth_host/bank_mirror.ts";
import { BankDocument } from "./bank_document.ts";
import { type LoadedBank, loadNewBank } from "./load_sound_bank.ts";
import { MirrorSync } from "./mirror_sync.ts";
import type { SampleDataSource } from "./sample_data_source.ts";
import type { SynthClient } from "./synth_client.ts";
import { BankStore } from "./bank_store.ts";
import { HistoryManager } from "./history.ts";
import {
    getInitialWriteFormat,
    getSaveExtension,
    pickSaveFile,
    resolveWriteFormat,
    type SaveFileHandle,
    type SaveFormat,
    writeFile,
    type WriteFormat
} from "./persistence.ts";
import type { SampleCopyRef } from "../synth_host/protocol.ts";
import { ConvertSamplesAction } from "./convert_samples_action.ts";

let nextSessionId = 1;

/**
 * One open sound bank: the document, its store and history, its mirror in the synthesizer host,
 * and where it was last saved.
 */
export class BankSession implements SampleDataSource {
    private saveHandle: SaveFileHandle | undefined;
    private writeFormat: WriteFormat;
    private isClosed = false;
    private readonly client: SynthClient;
    private readonly unsubscribeSync: () => void;
    private readonly mirrorSync: MirrorSync;
    public readonly id = nextSessionId++;
    public readonly document: BankDocument;
    public readonly store: BankStore;
    public readonly history: HistoryManager;

    /**
     * @param client the synthesizer host, which keeps this bank's mirror
     * @param loaded the loaded bank and its file, or undefined to start a new one
     */
    public constructor(
        client: SynthClient,
        loaded: LoadedBank = loadNewBank()
    ) {
        const { bank, file } = loaded;
        this.client = client;
        // The mirror pairs the elements by index, so it is opened before the document sorts them
        client.openBank(this.id, file, {
            presets: bank.presets.map((p) => getObjectId(p)),
            instruments: bank.instruments.map((i) => getObjectId(i)),
            samples: bank.samples.map((s) => getObjectId(s))
        });
        this.document = new BankDocument(bank);
        this.writeFormat = getInitialWriteFormat(this.document.bank);
        this.store = new BankStore(this.document);
        this.mirrorSync = new MirrorSync(
            client,
            this.id,
            this.document,
            this.store
        );
        // Every commit reaches the mirror, including ones made outside the history
        this.unsubscribeSync = this.store.subscribe(() => {
            this.mirrorSync.update();
        });
        this.history = new HistoryManager(this.document, this.store);
    }

    /**
     * Gives pasted or duplicated samples (not added yet) the data of their source samples.
     * @param copies each new sample and where its data comes from
     */
    public copySampleData(copies: ReadonlyMap<BasicSample, SampleCopyRef>) {
        for (const [copy, ref] of copies) {
            this.mirrorSync.copyDataOnAdd(copy, ref);
        }
    }

    /**
     * Has the host keep the samples' data as it is now, for pasting later.
     */
    public copyToClipboard(samples: Iterable<BasicSample>) {
        this.client.copyToClipboard(
            this.id,
            Array.from(samples, (s) => getObjectId(s))
        );
    }

    /**
     * Makes this bank the one the synthesizer plays, when its tab is shown.
     */
    public attach() {
        this.client.attach(this.id);
    }

    /**
     * Makes the keyboard play an element of this bank, or its first preset without one.
     */
    public setPreviewTarget(target: MirrorTarget | undefined) {
        this.client.setPreviewTarget(this.id, target);
    }

    public readAudio(sample: BasicSample) {
        return this.client.readAudio(this.id, getObjectId(sample));
    }

    public readStoredData(sample: BasicSample) {
        return this.client.readStoredData(this.id, getObjectId(sample));
    }

    /**
     * The sample's length in frames. The view knows it after audio the host kept came back,
     * which the editor's sample cannot tell.
     */
    public getSampleLength(sample: BasicSample) {
        return (
            this.store.getSnapshot().views.samples.get(getObjectId(sample))
                ?.length ?? sample.sampleLength
        );
    }

    /**
     * The format a save with this choice writes, "auto" meaning the last one.
     */
    public getWriteFormat(format: SaveFormat) {
        return resolveWriteFormat(format, this.writeFormat);
    }

    /**
     * Saves the bank: asks for the file first, then has the host convert the samples for an
     * explicit SF2 or SF3 save (recorded in the history) and write the mirror, writes the file,
     * and marks the position as saved.
     * Throws when encoding or writing fails, including when the user cancels the file picker.
     */
    public async save(
        format: SaveFormat,
        unnamed: string,
        progressFunction?: ProgressFunction
    ) {
        const target = this.getWriteFormat(format);
        // The views know the stored form, the editor's samples have no data
        const views = this.store.getSnapshot().views.samples;
        const hasCompressed = this.document.samples.some(
            (s) => views.get(getObjectId(s))?.isCompressed
        );
        const extension = getSaveExtension(hasCompressed, format, target);
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

        let convert: "pcm" | "compressed" | undefined;
        if (format === "sf2") {
            convert = "pcm";
        } else if (format === "sf3") {
            convert = "compressed";
        }
        const requestPosition = this.history.position;
        const result = await this.client.write(
            this.id,
            { format: target, convert, software: SOFTWARE_NAME },
            progressFunction
        );
        // A conversion that failed halfway changed some samples already
        if (result.conversion) {
            this.history.do([new ConvertSamplesAction(result.conversion)]);
        }
        if (!result.binary) {
            throw new Error(result.error ?? "The bank was not written.");
        }
        // Edits made while the host wrote may or may not be in the file, and edits made while the
        // file is written are not, so either keeps the bank dirty
        const savedPosition = this.history.position;
        const isUnchanged =
            savedPosition === requestPosition + (result.conversion ? 1 : 0);
        this.saveHandle = await writeFile(result.binary, name, handle);
        this.writeFormat = target;
        if (isUnchanged) {
            this.history.markSaved(savedPosition);
        }
    }

    /**
     * Releases the bank. Safe to call more than once, for example from two close prompts.
     */
    public close() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.unsubscribeSync();
        this.client.closeBank(this.id);
        this.document.bank.destroySoundBank();
    }
}
