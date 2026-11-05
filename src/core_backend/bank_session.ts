import type { BasicSample, ProgressFunction } from "spessasynth_core";
import { getObjectId } from "../utils/object_id.ts";
import { SOFTWARE_NAME } from "../utils/software_name.ts";
import { logError } from "../utils/core_utils.ts";
import type { MirrorTarget } from "../synth_host/bank_mirror.ts";
import { BankDocument } from "./bank_document.ts";
import {
    getUndecodableSamples,
    type LoadedBank,
    loadNewBank
} from "./load_sound_bank.ts";
import { MirrorSync } from "./mirror_sync.ts";
import type { SampleDataSource } from "./sample_data_source.ts";
import type { SynthClient } from "./synth_client.ts";
import { BankStore } from "./bank_store.ts";
import { HistoryManager } from "./history.ts";
import { ChangeSet } from "./change_set.ts";
import type { SampleView } from "./entity_views.ts";
import {
    getInitialWriteFormat,
    getSaveExtension,
    pickSaveFile,
    resolveWriteFormat,
    SaveError,
    type SaveFileHandle,
    type SaveFormat,
    writeFile,
    type WriteFormat
} from "./persistence.ts";
import type {
    ConversionReport,
    SampleCopyRef
} from "../synth_host/protocol.ts";
import {
    ConvertSamplesAction,
    type SampleConversion
} from "./convert_samples_action.ts";
import { setSampleFormWithoutData } from "./sample_form.ts";

let nextSessionId = 1;

/**
 * One open sound bank: the document, its store and history, its mirror in the synthesizer host,
 * and where it was last saved.
 */
export class BankSession implements SampleDataSource {
    private saveHandle: SaveFileHandle | undefined;
    private writeFormat: WriteFormat;
    private readonly closeController = new AbortController();
    /**
     * The save running now, which the next one waits for.
     */
    private runningSave: Promise<void> = Promise.resolve();
    private isSaveReserved = false;
    private hasUnsaved24BitData: boolean;
    private readonly client: SynthClient;
    private readonly unsubscribeSync: () => void;
    private readonly mirrorSync: MirrorSync;
    public readonly id = nextSessionId++;
    public readonly document: BankDocument;
    public readonly store: BankStore;
    public readonly history: HistoryManager;
    /**
     * Resolves once the host has loaded the bank's mirror, and rejects when it could not, in
     * which case the bank cannot play or be saved.
     */
    public readonly opened: Promise<undefined>;
    /**
     * Compressed samples whose data core cannot read (FLAC, broken streams), which play as
     * silence or in part.
     */
    public readonly undecodableSampleCount: number;

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
        this.hasUnsaved24BitData = loaded.has24BitSamples;
        const undecodable = getUndecodableSamples(bank);
        this.undecodableSampleCount = undecodable.length;
        // The mirror pairs the elements by index, so it is opened before the document sorts them
        this.opened = client.openBank(this.id, file, {
            presets: bank.presets.map((p) => getObjectId(p)),
            instruments: bank.instruments.map((i) => getObjectId(i)),
            samples: bank.samples.map((s) => getObjectId(s))
        });
        try {
            this.document = new BankDocument(bank);
            this.writeFormat = getInitialWriteFormat(this.document.bank);
            this.store = new BankStore(this.document);
            this.mirrorSync = new MirrorSync(
                client,
                this.id,
                this.document,
                this.store
            );
        } catch (error) {
            // Nothing would close the mirror otherwise
            client.closeBank(this.id);
            throw error;
        }
        // Every commit reaches the mirror, including ones made outside the history
        this.unsubscribeSync = this.store.subscribe(() => {
            this.mirrorSync.update();
        });
        this.history = new HistoryManager(this.document, this.store);
        if (undecodable.length > 0) {
            void this.readUndecodableLengths(undecodable);
        }
    }

    /**
     * Core reads a compressed sample's length from its Ogg pages, which FLAC data and broken
     * streams do not have, so the editor's bank says 0. The mirror decodes them (to silence when
     * it cannot), and its length is what plays and what a save writes.
     */
    private async readUndecodableLengths(samples: BasicSample[]) {
        try {
            const lengths = await this.client.readSampleLengths(
                this.id,
                samples.map((s) => getObjectId(s))
            );
            if (this.closeController.signal.aborted) {
                return;
            }
            const changes = new ChangeSet();
            for (const [i, sample] of samples.entries()) {
                // An edit may have given it new audio meanwhile
                if (!sample.isCompressed || sample.sampleLength !== 0) {
                    continue;
                }
                setSampleFormWithoutData(sample, "vorbis", lengths[i]);
                changes.touch(sample);
            }
            if (changes.entities.size > 0) {
                this.store.commit(changes, this.history.state);
            }
        } catch (error) {
            logError("Failed to read the lengths of the samples.", error);
        }
    }

    /**
     * Records what the host's conversion changed, for the samples nothing changed during the
     * save (see `SynthHost.write`). The host gave every sample its old data back, so a sample
     * left out (removed, edited, or given new audio meanwhile) stays as the editor has it, and
     * an undo of the conversion does not take back edits made during the save.
     * Returns how many commits it made.
     */
    private recordConversion(
        report: ConversionReport,
        startViews: ReadonlyMap<number, SampleView>
    ) {
        const views = this.store.getSnapshot().views.samples;
        const samples = new Map(
            this.document.samples.map((s) => [getObjectId(s), s])
        );
        const conversions = new Array<SampleConversion>();
        for (const { id, before, after } of report.samples) {
            const sample = samples.get(id);
            const view = views.get(id);
            const isUnchanged =
                view?.audioRevision === startViews.get(id)?.audioRevision &&
                view?.sampleRate === before.sampleRate &&
                view.loopStart === before.loopStart &&
                view.loopEnd === before.loopEnd;
            if (sample && isUnchanged) {
                conversions.push({ sample, before, after });
            }
        }
        const { version } = this.document.bank.soundBankInfo;
        if (conversions.length > 0) {
            this.history.do([
                new ConvertSamplesAction({
                    samples: conversions,
                    beforeSnapshot: report.beforeSnapshot,
                    afterSnapshot: report.afterSnapshot,
                    versionBefore: { ...version },
                    versionAfter: report.versionAfter
                })
            ]);
            return 1;
        }
        const isVersionChanged =
            version.major !== report.versionAfter.major ||
            version.minor !== report.versionAfter.minor;
        if (!isVersionChanged || report.samples.length > 0) {
            return 0;
        }
        // Only the version changed, which is part of the save and no step to undo
        this.document.bank.soundBankInfo.version = { ...report.versionAfter };
        const changes = new ChangeSet();
        changes.touchBankInfo();
        this.store.commit(changes, this.history.state);
        return 1;
    }

    private async performSave(
        format: SaveFormat,
        unnamed: string,
        progressFunction: ProgressFunction | undefined
    ) {
        const { signal } = this.closeController;
        signal.throwIfAborted();
        const target = this.getWriteFormat(format);
        const extension = getSaveExtension(
            this.hasCompressedSamples(),
            format,
            target
        );
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
        // The tab may have closed while the picker was open
        signal.throwIfAborted();

        let convert: "pcm" | "compressed" | undefined;
        if (format === "sf2") {
            convert = "pcm";
        } else if (format === "sf3") {
            convert = "compressed";
        }
        const start = this.store.getSnapshot();
        const result = await this.client.write(
            this.id,
            { format: target, convert, software: SOFTWARE_NAME },
            progressFunction
        );
        // A closed bank records and writes nothing
        signal.throwIfAborted();
        if (!result.binary) {
            throw new SaveError(
                result.error ?? "The bank was not written.",
                result.failure
            );
        }
        // The last guard against SF3 data in a .sf2 file
        if (extension === "sf2" && result.hasCompressedSamples) {
            throw new Error(
                "The bank has compressed samples, which a .sf2 file cannot hold."
            );
        }
        const commits = result.conversion
            ? this.recordConversion(result.conversion, start.views.samples)
            : 0;
        // Any other change since the save started (an edit, an undo, a merged wheel notch) is
        // not in the file, so it keeps the bank dirty
        const expectedRevision = start.revision + commits;
        const savedPosition = this.history.position;
        this.saveHandle = await writeFile(result.binary, name, handle);
        this.writeFormat = target;
        this.hasUnsaved24BitData = false;
        if (this.store.getSnapshot().revision === expectedRevision) {
            this.history.markSaved(savedPosition);
        }
    }

    /**
     * Aborted when the bank closes, which ends its saves and its open save questions.
     */
    public get closeSignal() {
        return this.closeController.signal;
    }

    /**
     * Whether the file the bank came from has 24-bit sample data, which core reads as 16-bit,
     * and no save wrote the bank since.
     */
    public get has24BitSamples() {
        return this.hasUnsaved24BitData;
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
     * Whether any sample is compressed. The views know the stored form, the editor's samples
     * have no data.
     */
    public hasCompressedSamples() {
        const views = this.store.getSnapshot().views.samples;
        return this.document.samples.some(
            (s) => views.get(getObjectId(s))?.isCompressed
        );
    }

    /**
     * The format a save with this choice writes, "auto" meaning the last one.
     */
    public getWriteFormat(format: SaveFormat) {
        return resolveWriteFormat(format, this.writeFormat);
    }

    /**
     * Holds the bank for one save, from its first question until the file is written, and
     * returns the function that lets go of it. Returns undefined while another save holds it.
     */
    public reserveSave() {
        if (this.isSaveReserved) {
            return undefined;
        }
        this.isSaveReserved = true;
        return () => {
            this.isSaveReserved = false;
        };
    }

    /**
     * Saves the bank: asks for the file first, then has the host convert the samples for an
     * explicit SF2 or SF3 save (recorded in the history) and write the mirror, writes the file,
     * and marks the position as saved. A save waits for the one before it.
     * Throws when encoding or writing fails, including when the user cancels the file picker,
     * and an `AbortError` when the bank closes before the file is written.
     */
    public save(
        format: SaveFormat,
        unnamed: string,
        progressFunction?: ProgressFunction
    ) {
        const previous = this.runningSave;
        const save = (async () => {
            await Promise.allSettled([previous]);
            await this.performSave(format, unnamed, progressFunction);
        })();
        this.runningSave = save;
        return save;
    }

    /**
     * Releases the bank. Safe to call more than once, for example from two close prompts.
     * The host closes the mirror once a running write of it is done.
     */
    public close() {
        if (this.closeController.signal.aborted) {
            return;
        }
        this.closeController.abort();
        this.unsubscribeSync();
        this.client.closeBank(this.id);
        this.document.bank.destroySoundBank();
    }
}
