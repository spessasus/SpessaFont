import type {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    Modulator,
    SoundBankInfoData
} from "spessasynth_core";
import { type BankViews, updateBankViews } from "./entity_views.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankEntity } from "./bank_view.ts";
import type { ChangeSet } from "./change_set.ts";

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
    readonly presets: readonly BasicPreset[];
    readonly instruments: readonly BasicInstrument[];
    readonly samples: readonly BasicSample[];
    readonly info: Readonly<SoundBankInfoData>;
    readonly defaultModulators: readonly Modulator[];
    readonly history: HistoryState;
    /**
     * Plain, frozen copies of the elements. They replace the core-object fields above as the
     * UI moves to them (issue #27).
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
    private readonly entityRevisions = new WeakMap<BankEntity, number>();
    private readonly audioRevisions = new WeakMap<BasicSample, number>();
    private readonly getAudioRevision = (sample: BasicSample) =>
        this.audioRevisions.get(sample) ?? 0;
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
            defaultModulators: [...bank.defaultModulators],
            history: { canUndo: false, canRedo: false, isDirty: false },
            views: updateBankViews(bank, this.getAudioRevision)
        };
    }

    /**
     * Presets show their instruments and instruments show their samples,
     * so a change to a child is also a change to every element that uses it.
     */
    private bumpWithParents(entity: BankEntity, revision: number) {
        if (this.entityRevisions.get(entity) === revision) {
            return;
        }
        this.entityRevisions.set(entity, revision);
        if ("linkedTo" in entity) {
            for (const parent of entity.linkedTo) {
                this.bumpWithParents(parent, revision);
            }
        }
    }

    /**
     * The views built from scratch from the current bank, for tests that compare them with the
     * incrementally updated ones.
     */
    public buildFreshViews() {
        return updateBankViews(this.document.bank, this.getAudioRevision);
    }

    /**
     * Returns the revision at which the entity or one of its children last changed, 0 if never.
     */
    public getEntityRevision(entity: BankEntity) {
        return this.entityRevisions.get(entity) ?? 0;
    }

    /**
     * Publishes a new snapshot for the given changes and notifies the subscribers.
     */
    public commit(changes: ChangeSet, history: HistoryState) {
        const previous = this.snapshot;
        const revision = previous.revision + 1;
        const bank = this.document.bank;

        for (const entity of changes.entities) {
            this.bumpWithParents(entity, revision);
        }
        for (const sample of changes.audio) {
            this.audioRevisions.set(sample, revision);
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
            defaultModulators: changes.hasBankInfoChanged
                ? [...bank.defaultModulators]
                : previous.defaultModulators,
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
