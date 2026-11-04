import type { BasicSoundBank } from "spessasynth_core";
import { isElementDiffEmpty, type ViewDiff } from "./view_diff.ts";

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
 * Connects one bank's mirror to the shared synthesizer while its tab is active, and tells the
 * synthesizer what each commit changed.
 */
export class SynthBinding {
    private readonly host: SynthHost;
    private readonly bank: BasicSoundBank;

    /**
     * @param bank the mirror's bank, which the synthesizer plays
     */
    public constructor(host: SynthHost, bank: BasicSoundBank) {
        this.host = host;
        this.bank = bank;
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
     * Refreshes what a commit needs, after the mirror applied it.
     */
    public update(diff: ViewDiff) {
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
