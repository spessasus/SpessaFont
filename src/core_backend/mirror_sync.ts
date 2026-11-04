import type { BasicSample, SampleStoredData } from "spessasynth_core";
import {
    type BankMirror,
    copyStoredData,
    type SampleCopySource
} from "../synth_host/bank_mirror.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankSnapshot } from "./bank_store.ts";
import { diffBankViews } from "./view_diff.ts";

/**
 * Keeps the mirror up to date with the store: each commit becomes one patch of the views that
 * changed. New actions need no code here.
 */
export class MirrorSync {
    private readonly mirror: BankMirror;
    private readonly document: BankDocument;
    private snapshot: BankSnapshot;
    /**
     * The audio revision the mirror has of each sample. Kept for removed samples too, since
     * the mirror keeps their data for an undo.
     */
    private readonly sentRevisions = new Map<number, number>();
    /**
     * Pasted and duplicated samples, whose data the mirror copies from the source's mirror.
     */
    private readonly pendingCopies = new WeakMap<
        BasicSample,
        SampleCopySource
    >();

    /**
     * @param snapshot the store's first snapshot. The mirror was loaded from the same file, so
     * it only needs the editor's order (the document sorts on load) and bank info.
     */
    public constructor(
        mirror: BankMirror,
        document: BankDocument,
        snapshot: BankSnapshot
    ) {
        this.mirror = mirror;
        this.document = document;
        this.snapshot = snapshot;
        const { views } = snapshot;
        for (const view of views.samples.values()) {
            this.sentRevisions.set(view.id, view.audioRevision);
        }
        const unchanged = { changed: [], removed: [], order: undefined };
        mirror.apply({
            views: {
                presets: { ...unchanged, order: views.presetOrder },
                instruments: { ...unchanged, order: views.instrumentOrder },
                samples: { ...unchanged, order: views.sampleOrder },
                defaultModulators: undefined
            },
            info: snapshot.info,
            sampleData: new Map(),
            sampleCopies: new Map()
        });
    }

    /**
     * Makes the mirror copy a new sample's data from a sample of a mirror, when the commit that
     * adds it arrives.
     */
    public copyDataOnAdd(sample: BasicSample, source: SampleCopySource) {
        this.pendingCopies.set(sample, source);
    }

    /**
     * Sends what changed since the last snapshot and returns the view diff, or undefined when no
     * view changed.
     */
    public update(snapshot: BankSnapshot) {
        const previous = this.snapshot;
        this.snapshot = snapshot;
        const isInfoChanged = previous.info !== snapshot.info;
        if (!isInfoChanged && previous.views === snapshot.views) {
            return undefined;
        }
        const views = diffBankViews(previous.views, snapshot.views);
        const sampleData = new Map<number, SampleStoredData>();
        const sampleCopies = new Map<number, SampleCopySource>();
        for (const view of views.samples.changed) {
            if (this.sentRevisions.get(view.id) === view.audioRevision) {
                continue;
            }
            const sample = this.document.getSample(view.id);
            if (!sample) {
                throw new Error(`The sample with the id ${view.id} is gone.`);
            }
            this.sentRevisions.set(view.id, view.audioRevision);
            const copy = this.pendingCopies.get(sample);
            if (copy) {
                this.pendingCopies.delete(sample);
                sampleCopies.set(view.id, copy);
            } else if (sample.hasData) {
                // A new empty sample has nothing to send, and the mirror's copy is empty too
                sampleData.set(view.id, copyStoredData(sample.getStoredData()));
            }
        }
        this.mirror.apply({
            views,
            info: isInfoChanged ? snapshot.info : undefined,
            sampleData,
            sampleCopies
        });
        return previous.views === snapshot.views ? undefined : views;
    }
}
