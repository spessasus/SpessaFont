import type {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    SoundBankInfoData
} from "spessasynth_core";
import {
    type BankViews,
    createIndex,
    updateBankViews
} from "./entity_views.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet, ElementList, RestoredAudio } from "./change_set.ts";
import type { HistoryLabel } from "./history_label.ts";
import type { BankEntity } from "./bank_view.ts";

export interface HistoryState {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly isDirty: boolean;
    /**
     * What undo and redo would undo or redo, for the Edit menu.
     */
    readonly undoLabel: HistoryLabel | undefined;
    readonly redoLabel: HistoryLabel | undefined;
}

/**
 * Finds the core object of an element by its view id, for the identity a handler or the
 * selection needs.
 */
export interface EntityLookup {
    readonly preset: (id: number) => BasicPreset | undefined;
    readonly instrument: (id: number) => BasicInstrument | undefined;
    readonly sample: (id: number) => BasicSample | undefined;
}

function createLookup<E extends BankEntity>(elements: readonly E[]) {
    const getIndex = createIndex(elements);
    return (id: number) => getIndex().get(id);
}

/**
 * The same elements in the same order, compared one by one, so a list stays the same object.
 */
function isSameList<E>(previous: readonly E[], current: readonly E[]) {
    return (
        previous.length === current.length &&
        previous.every((element, i) => element === current[i])
    );
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
     * Finds elements of the lists above by id. Its maps are built once per list on first use,
     * and shared by every component that reads them.
     */
    readonly lookup: EntityLookup;
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
        const presets = [...bank.presets];
        const instruments = [...bank.instruments];
        const samples = [...bank.samples];
        this.snapshot = {
            revision: 0,
            presets,
            instruments,
            samples,
            lookup: {
                preset: createLookup(presets),
                instrument: createLookup(instruments),
                sample: createLookup(samples)
            },
            info: { ...bank.soundBankInfo },
            history: {
                canUndo: false,
                canRedo: false,
                isDirty: false,
                undoLabel: undefined,
                redoLabel: undefined
            },
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
            previous.history.isDirty !== history.isDirty ||
            previous.history.undoLabel !== history.undoLabel ||
            previous.history.redoLabel !== history.redoLabel;

        // A rename touches its list, but only an added, removed or moved element changes it
        const changedLists = new Set<ElementList>();
        const updateList = <E extends BankEntity>(
            list: ElementList,
            previousList: readonly E[],
            current: readonly E[]
        ) => {
            if (!changes.lists.has(list) || isSameList(previousList, current)) {
                return previousList;
            }
            changedLists.add(list);
            return [...current];
        };
        const presets = updateList("presets", previous.presets, bank.presets);
        const instruments = updateList(
            "instruments",
            previous.instruments,
            bank.instruments
        );
        const samples = updateList("samples", previous.samples, bank.samples);
        const lookup =
            changedLists.size === 0
                ? previous.lookup
                : {
                      preset:
                          presets === previous.presets
                              ? previous.lookup.preset
                              : createLookup(presets),
                      instrument:
                          instruments === previous.instruments
                              ? previous.lookup.instrument
                              : createLookup(instruments),
                      sample:
                          samples === previous.samples
                              ? previous.lookup.sample
                              : createLookup(samples)
                  };

        this.snapshot = {
            revision,
            presets,
            instruments,
            samples,
            lookup,
            info: changes.hasBankInfoChanged
                ? { ...bank.soundBankInfo }
                : previous.info,
            history: isHistoryChanged ? { ...history } : previous.history,
            views: updateBankViews(
                bank,
                this.getAudioRevision,
                previous.views,
                {
                    entities: changes.entities,
                    lists: changedLists,
                    hasBankInfoChanged: changes.hasBankInfoChanged
                }
            )
        };
        for (const listener of this.listeners) {
            listener();
        }
    }
}
