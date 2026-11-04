import type { BasicSample, SampleStoredData } from "spessasynth_core";
import type { BankEditView, BankEntity } from "./bank_view.ts";

export type ElementList = "presets" | "instruments" | "samples";

/**
 * Audio the synthesizer host has kept (the data before or after a conversion), which a sample
 * gets back without the editor holding it. Core cannot set a data-less sample's form and length
 * (`setLengthWithoutData` is internal), so the views take them from here.
 */
export interface RestoredAudio {
    readonly snapshot: number;
    readonly form: SampleStoredData["form"];
    readonly length: number;
}

/**
 * Collects what a group of history actions changed,
 * so the store can notify only what is affected.
 * Actions also leave a focus hint here, which the UI may use to change the selection.
 */
export class ChangeSet {
    private readonly touchedEntities = new Set<BankEntity>();
    private readonly touchedLists = new Set<ElementList>();
    private readonly touchedAudio = new Set<BasicSample>();
    private readonly restored = new Map<BasicSample, RestoredAudio>();
    private isBankInfoTouched = false;
    private focusTarget: BankEditView | undefined;

    /**
     * Entities whose own data changed.
     */
    public get entities(): ReadonlySet<BankEntity> {
        return this.touchedEntities;
    }

    /**
     * Element lists whose membership, order or displayed names changed.
     */
    public get lists(): ReadonlySet<ElementList> {
        return this.touchedLists;
    }

    /**
     * Samples whose audio data changed, not only their metadata.
     */
    public get audio(): ReadonlySet<BasicSample> {
        return this.touchedAudio;
    }

    /**
     * The samples among `audio` whose audio comes back from the host.
     */
    public get restoredAudio(): ReadonlyMap<BasicSample, RestoredAudio> {
        return this.restored;
    }

    /**
     * True when the bank info or the default modulators changed.
     */
    public get hasBankInfoChanged() {
        return this.isBankInfoTouched;
    }

    /**
     * The element the UI should select after this change, if any.
     */
    public get focus() {
        return this.focusTarget;
    }

    public get isEmpty() {
        return (
            this.touchedEntities.size === 0 &&
            this.touchedLists.size === 0 &&
            !this.isBankInfoTouched
        );
    }

    public touch(...entities: BankEntity[]) {
        for (const entity of entities) {
            this.touchedEntities.add(entity);
        }
    }

    /**
     * Marks the sample's audio data as changed, and the sample as touched. The new data is set on
     * the sample, or kept by the host when `restored` says so.
     */
    public touchSampleAudio(sample: BasicSample, restored?: RestoredAudio) {
        this.touchedAudio.add(sample);
        this.touchedEntities.add(sample);
        if (restored) {
            this.restored.set(sample, restored);
        } else {
            this.restored.delete(sample);
        }
    }

    public touchList(list: ElementList) {
        this.touchedLists.add(list);
    }

    public touchBankInfo() {
        this.isBankInfoTouched = true;
    }

    /**
     * Sets the focus hint. The last action in a group wins.
     */
    public focusOn(view: BankEditView) {
        this.focusTarget = view;
    }
}
