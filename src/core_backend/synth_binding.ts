import {
    BasicSoundBank,
    SoundBankLoader,
    type SpessaSynthProcessor
} from "spessasynth_core";
import type { VoiceCache } from "./history.ts";

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * The synthesizer a bank is attached to: the processor, and a preset list refresh that also
 * restores what the keyboard's channel plays (`AudioEngine.refreshPresets`).
 */
export interface SynthHost {
    readonly processor: SpessaSynthProcessor;
    refreshPresets(): void;
}

/**
 * Connects one bank to the shared synthesizer while its tab is active.
 */
export class SynthBinding implements VoiceCache {
    private readonly host: SynthHost;
    private readonly bank: BasicSoundBank;

    public constructor(host: SynthHost, bank: BasicSoundBank) {
        this.host = host;
        this.bank = bank;
    }

    public get isAttached() {
        return (
            this.host.processor.soundBankManager.soundBankList[0]?.soundBank ===
            this.bank
        );
    }

    /**
     * Makes this bank the synthesizer's main bank.
     * Channels keep the preset they resolved before, so they are pointed at the new bank's presets.
     */
    public attach() {
        this.host.processor.soundBankManager.addSoundBank(this.bank, "main");
        this.host.refreshPresets();
    }

    /**
     * Replaces this bank with the built-in sample bank if it is still the main bank.
     * A bank in a background tab is not in the synthesizer, so nothing changes for it.
     */
    public detach() {
        if (!this.isAttached) {
            return;
        }
        this.host.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice()),
            "main"
        );
        this.host.refreshPresets();
    }

    public clearCache() {
        this.host.processor.clearCache();
    }
}
