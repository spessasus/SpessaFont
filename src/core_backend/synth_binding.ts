import {
    BasicSoundBank,
    SoundBankLoader,
    type SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import type { VoiceCache } from "./history.ts";

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * Connects one bank to the shared synthesizer while its tab is active.
 */
export class SynthBinding implements VoiceCache {
    private readonly processor: SpessaSynthProcessor;
    private readonly sequencer: SpessaSynthSequencer;
    private readonly bank: BasicSoundBank;

    public constructor(
        processor: SpessaSynthProcessor,
        sequencer: SpessaSynthSequencer,
        bank: BasicSoundBank
    ) {
        this.processor = processor;
        this.sequencer = sequencer;
        this.bank = bank;
    }

    /**
     * Channels keep the preset they resolved before the bank changed.
     * Seeking makes the sequencer resend the program changes, so channels pick presets from the new bank.
     * spessasynth_core has no call that re-resolves channel presets directly, which would remove this.
     */
    private refreshSequencerPresets() {
        this.sequencer.currentTime -= 0.1;
    }

    public get isAttached() {
        return (
            this.processor.soundBankManager.soundBankList[0]?.soundBank ===
            this.bank
        );
    }

    /**
     * Makes this bank the synthesizer's main bank.
     */
    public attach() {
        this.processor.soundBankManager.addSoundBank(this.bank, "main");
        this.processor.clearCache();
        this.refreshSequencerPresets();
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
        this.processor.clearCache();
    }

    public clearCache() {
        this.processor.clearCache();
    }
}
