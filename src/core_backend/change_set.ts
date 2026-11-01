import type { BankEditView, BankEntity } from "./bank_view.ts";

export type ElementList = "presets" | "instruments" | "samples";

/**
 * Collects what a group of history actions changed,
 * so the store can notify only what is affected.
 * Actions also leave a focus hint here, which the UI may use to change the selection.
 */
export class ChangeSet {
    private readonly touchedEntities = new Set<BankEntity>();
    private readonly touchedLists = new Set<ElementList>();
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
