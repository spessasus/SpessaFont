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
    private isFormatTouched = false;
    private readonly hints = new Array<BankEditView>();

    /**
     * Entities whose own data changed.
     */
    public get entities(): ReadonlySet<BankEntity> {
        return this.touchedEntities;
    }

    /**
     * Element lists whose membership or order may have changed. The store checks whether they
     * did, so touching a list that stayed the same costs only that check.
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
     * True when the bank format (SF2 or SFE mode) changed.
     */
    public get hasFormatChanged() {
        return this.isFormatTouched;
    }

    /**
     * The elements the actions asked the UI to select, in the order they asked.
     * The history picks one of them.
     */
    public get focusHints(): readonly BankEditView[] {
        return this.hints;
    }

    public get isEmpty() {
        return (
            this.touchedEntities.size === 0 &&
            this.touchedLists.size === 0 &&
            !this.isBankInfoTouched &&
            !this.isFormatTouched
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

    public touchFormat() {
        this.isFormatTouched = true;
    }

    /**
     * Adds a focus hint. The last one of a group wins, or the first one when it is undone, as
     * undo runs the group backward. Hints to elements gone by the end of the group are skipped.
     */
    public focusOn(view: BankEditView) {
        this.hints.push(view);
    }
}
