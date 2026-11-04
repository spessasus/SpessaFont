import type { BasicSoundBank } from "spessasynth_core";
import type { BankViews } from "./entity_views.ts";
import { diffBankViews, isElementDiffEmpty } from "./view_diff.ts";

/**
 * What a bank needs from the synthesizer (`AudioEngine`).
 */
export interface SynthHost {
    isBankAttached(bank: BasicSoundBank): boolean;

    /**
     * Makes the bank the synthesizer's main bank.
     */
    attachBank(bank: BasicSoundBank): void;

    /**
     * Puts the built-in sample bank back if this bank is the main bank.
     */
    detachBank(bank: BasicSoundBank): void;

    /**
     * Drops the cached voices, after an edit to what they are made of.
     */
    clearCache(): void;

    /**
     * Rebuilds the preset list, after presets were added, removed or changed. Core's list keeps
     * each preset's zone array from when it was built. This also clears the cache.
     */
    refreshPresets(): void;
}

/**
 * Connects one bank to the shared synthesizer while its tab is active, and tells the
 * synthesizer what each commit changed.
 */
export class SynthBinding {
    private readonly host: SynthHost;
    private readonly bank: BasicSoundBank;
    private views: BankViews;

    public constructor(
        host: SynthHost,
        bank: BasicSoundBank,
        views: BankViews
    ) {
        this.host = host;
        this.bank = bank;
        this.views = views;
    }

    public get isAttached() {
        return this.host.isBankAttached(this.bank);
    }

    public attach() {
        this.host.attachBank(this.bank);
    }

    /**
     * A bank in a background tab is not in the synthesizer, so nothing changes for it.
     */
    public detach() {
        this.host.detachBank(this.bank);
    }

    /**
     * Compares the views with the last ones it saw and refreshes what the change needs.
     */
    public update(views: BankViews) {
        const previous = this.views;
        this.views = views;
        if (previous === views) {
            return;
        }
        const diff = diffBankViews(previous, views);
        if (this.isAttached && !isElementDiffEmpty(diff.presets)) {
            this.host.refreshPresets();
            return;
        }
        const isChanged =
            !isElementDiffEmpty(diff.presets) ||
            !isElementDiffEmpty(diff.instruments) ||
            !isElementDiffEmpty(diff.samples) ||
            diff.defaultModulators !== undefined;
        if (isChanged) {
            this.host.clearCache();
        }
    }
}
