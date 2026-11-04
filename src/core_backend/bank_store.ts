import type {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    SoundBankInfoData
} from "spessasynth_core";
import { type BankViews, updateBankViews } from "./entity_views.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet, RestoredAudio } from "./change_set.ts";

export interface HistoryState {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly isDirty: boolean;
}

/**
 * An immutable view of the bank for React.
 * Each field keeps its identity until the data behind it changes,
 * so selector hooks only re-render the components that read the changed part.
 */
export interface BankSnapshot {
    /**
     * Increases with every change to the bank or the history.
     */
    readonly revision: number;
    /**
     * The elements as identities, for the selection and the handlers. Render reads their
     * data from `views`, never from these objects, which are edited in place.
     */
    readonly presets: readonly BasicPreset[];
    readonly instruments: readonly BasicInstrument[];
    readonly samples: readonly BasicSample[];
    /**
     * A copy of the bank info.
     */
    readonly info: Readonly<SoundBankInfoData>;
    readonly history: HistoryState;
    /**
     * Plain, frozen copies of the elements, which keep their identity until their data
     * changes (issue #27).
     */
    readonly views: BankViews;
}

/**
 * External store for one bank, read with `useSyncExternalStore`.
 * The core objects stay mutable. The store only tracks when they change.
 */
export class BankStore {
    private readonly document: BankDocument;
    private readonly listeners = new Set<() => void>();
    private readonly audioRevisions = new WeakMap<BasicSample, number>();
    /**
     * Samples whose last audio change came back from the host.
     */
    private readonly restoredAudio = new WeakMap<BasicSample, RestoredAudio>();
    private readonly getAudioRevision = (sample: BasicSample) => ({
        revision: this.audioRevisions.get(sample) ?? 0,
        restored: this.restoredAudio.get(sample)
    });
    private snapshot: BankSnapshot;

    public readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public readonly getSnapshot = () => this.snapshot;

    public constructor(document: BankDocument) {
        this.document = document;
        const bank = document.bank;
        this.snapshot = {
            revision: 0,
            presets: [...bank.presets],
            instruments: [...bank.instruments],
            samples: [...bank.samples],
            info: { ...bank.soundBankInfo },
            history: { canUndo: false, canRedo: false, isDirty: false },
            views: updateBankViews(bank, this.getAudioRevision)
        };
    }

    /**
     * The views built from scratch from the current bank, for tests that compare them with the
     * incrementally updated ones.
     */
    public buildFreshViews() {
        return updateBankViews(this.document.bank, this.getAudioRevision);
    }

    /**
     * The host's audio a sample's last audio change restored, if it did.
     */
    public getRestoredAudio(sample: BasicSample) {
        return this.restoredAudio.get(sample);
    }

    /**
     * Publishes a new snapshot for the given changes and notifies the subscribers.
     */
    public commit(changes: ChangeSet, history: HistoryState) {
        const previous = this.snapshot;
        const revision = previous.revision + 1;
        const bank = this.document.bank;

        for (const sample of changes.audio) {
            this.audioRevisions.set(sample, revision);
            const restored = changes.restoredAudio.get(sample);
            if (restored) {
                this.restoredAudio.set(sample, restored);
            } else {
                this.restoredAudio.delete(sample);
            }
        }

        const isHistoryChanged =
            previous.history.canUndo !== history.canUndo ||
            previous.history.canRedo !== history.canRedo ||
            previous.history.isDirty !== history.isDirty;

        this.snapshot = {
            revision,
            presets: changes.lists.has("presets")
                ? [...bank.presets]
                : previous.presets,
            instruments: changes.lists.has("instruments")
                ? [...bank.instruments]
                : previous.instruments,
            samples: changes.lists.has("samples")
                ? [...bank.samples]
                : previous.samples,
            info: changes.hasBankInfoChanged
                ? { ...bank.soundBankInfo }
                : previous.info,
            history: isHistoryChanged ? { ...history } : previous.history,
            views: updateBankViews(
                bank,
                this.getAudioRevision,
                previous.views,
                changes
            )
        };
        for (const listener of this.listeners) {
            listener();
        }
    }
}
