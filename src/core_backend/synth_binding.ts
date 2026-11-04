import {
    BasicSoundBank,
    SoundBankLoader,
    type SpessaSynthProcessor
} from "spessasynth_core";
import type { VoiceCache } from "./history.ts";

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * Connects one bank to the shared synthesizer while its tab is active.
 */
export class SynthBinding implements VoiceCache {
    private readonly processor: SpessaSynthProcessor;
    private readonly bank: BasicSoundBank;

    public constructor(processor: SpessaSynthProcessor, bank: BasicSoundBank) {
        this.processor = processor;
        this.bank = bank;
    }

    public get isAttached() {
        return (
            this.processor.soundBankManager.soundBankList[0]?.soundBank ===
            this.bank
        );
    }

    /**
     * Makes this bank the synthesizer's main bank.
     * Channels keep the preset they resolved before, so they are pointed at the new bank's presets.
     */
    public attach() {
        this.processor.soundBankManager.addSoundBank(this.bank, "main");
        this.processor.refreshPresets();
    }

    /**
     * Replaces this bank with the built-in sample bank if it is still the main bank.
     */
    public detach() {
        if (this.isAttached) {
            this.processor.soundBankManager.addSoundBank(
                SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice()),
                "main"
            );
        }
        this.processor.refreshPresets();
    }

    public clearCache() {
        this.processor.clearCache();
    }
}
