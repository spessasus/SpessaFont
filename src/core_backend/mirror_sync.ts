import type { BasicSample, SampleStoredData } from "spessasynth_core";
import { copyStoredData } from "../synth_host/bank_mirror.ts";
import type { SampleCopyRef } from "../synth_host/protocol.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankSnapshot, BankStore } from "./bank_store.ts";
import type { SynthClient } from "./synth_client.ts";
import { diffBankViews } from "./view_diff.ts";

/**
 * Keeps the session's mirror in the host up to date with the store: each commit becomes one
 * patch of the views that changed. New actions need no code here. The mirror holds the only copy
 * of the sample data, an action that gives a sample new audio sets it on the editor's sample,
 * and it is moved from there.
 */
export class MirrorSync {
    private readonly client: SynthClient;
    private readonly sessionId: number;
    private readonly document: BankDocument;
    private readonly store: BankStore;
    private snapshot: BankSnapshot;
    /**
     * The audio revision the mirror has of each sample. Kept for removed samples too, since
     * the mirror keeps their data for an undo.
     */
    private readonly sentRevisions = new Map<number, number>();
    /**
     * Pasted and duplicated samples, whose data the mirror copies from the source's mirror.
     */
    private readonly pendingCopies = new WeakMap<BasicSample, SampleCopyRef>();

    /**
     * Sends the first patch: the mirror was loaded from the same file, so it only needs the
     * editor's order (the document sorts on load) and bank info.
     */
    public constructor(
        client: SynthClient,
        sessionId: number,
        document: BankDocument,
        store: BankStore
    ) {
        this.client = client;
        this.sessionId = sessionId;
        this.document = document;
        this.store = store;
        this.snapshot = store.getSnapshot();
        const { views } = this.snapshot;
        for (const view of views.samples.values()) {
            this.sentRevisions.set(view.id, view.audioRevision);
        }
        const unchanged = { changed: [], removed: [], order: undefined };
        client.patchBank(sessionId, {
            views: {
                presets: { ...unchanged, order: views.presetOrder },
                instruments: { ...unchanged, order: views.instrumentOrder },
                samples: { ...unchanged, order: views.sampleOrder },
                defaultModulators: undefined
            },
            info: this.snapshot.info,
            sampleData: new Map(),
            sampleCopies: new Map(),
            sampleRestores: new Map()
        });
    }

    /**
     * Makes the mirror copy a new sample's data from a sample of a session's mirror, when the
     * commit that adds it arrives.
     */
    public copyDataOnAdd(sample: BasicSample, source: SampleCopyRef) {
        this.pendingCopies.set(sample, source);
    }

    /**
     * Sends what changed since the last snapshot.
     */
    public update() {
        const previous = this.snapshot;
        const snapshot = this.store.getSnapshot();
        this.snapshot = snapshot;
        const isInfoChanged = previous.info !== snapshot.info;
        if (!isInfoChanged && previous.views === snapshot.views) {
            return;
        }
        const views = diffBankViews(previous.views, snapshot.views);
        const sampleData = new Map<number, SampleStoredData>();
        const sampleCopies = new Map<number, SampleCopyRef>();
        const sampleRestores = new Map<number, number>();
        for (const view of views.samples.changed) {
            if (this.sentRevisions.get(view.id) === view.audioRevision) {
                continue;
            }
            const sample = this.document.getSample(view.id);
            if (!sample) {
                throw new Error(`The sample with the id ${view.id} is gone.`);
            }
            this.sentRevisions.set(view.id, view.audioRevision);
            const restored = this.store.getRestoredAudio(sample);
            const copy = this.pendingCopies.get(sample);
            if (restored) {
                sampleRestores.set(view.id, restored.snapshot);
            } else if (copy) {
                this.pendingCopies.delete(sample);
                sampleCopies.set(view.id, copy);
            } else if (sample.hasData) {
                // A new empty sample has nothing to send, and the mirror's copy is empty too
                sampleData.set(view.id, copyStoredData(sample.getStoredData()));
            }
            // The editor's samples hold data only on its way to the mirror. The length and
            // the stored form stay, for the views.
            sample.releaseData();
        }
        this.client.patchBank(this.sessionId, {
            views,
            info: isInfoChanged ? snapshot.info : undefined,
            sampleData,
            sampleCopies,
            sampleRestores
        });
    }
}
