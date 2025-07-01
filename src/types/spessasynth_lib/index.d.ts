declare module "spessasynth_lib" {
    type ChorusConfig = {
        /** the number of delay nodes (for each channel) and the corresponding oscillators */
        nodesAmount?: number;

        /** the initial delay, in seconds */
        defaultDelay?: number;

        /** the difference between delays in the delay nodes */
        delayVariation?: number;

        /** the difference of delays between two channels (added to the left channel and subtracted from the right) */
        stereoDifference?: number;

        /** the initial delay time oscillator frequency, in Hz. */
        oscillatorFrequency?: number;

        /** the difference between frequencies of oscillators, in Hz */
        oscillatorFrequencyVariation?: number;

        /** specifies how much will oscillator alter the delay in delay nodes, in seconds */
        oscillatorGain?: number;
    };

    const NODES_AMOUNT = 4;
    const DEFAULT_DELAY = 0.03;
    const DELAY_VARIATION = 0.01;
    const STEREO_DIFF = 0.02;

    const OSC_FREQ = 0.2;
    const OSC_FREQ_VARIATION = 0.05;
    const OSC_GAIN = 0.003;

    export const DEFAULT_CHORUS_CONFIG: ChorusConfig = {
        nodesAmount: NODES_AMOUNT,
        defaultDelay: DEFAULT_DELAY,
        delayVariation: DELAY_VARIATION,
        stereoDifference: STEREO_DIFF,
        oscillatorFrequency: OSC_FREQ,
        oscillatorFrequencyVariation: OSC_FREQ_VARIATION,
        oscillatorGain: OSC_GAIN
    };

    export class FancyChorus {
        input: ChannelSplitterNode;

        constructor(
            output: AudioNode,
            config: ChorusConfig = DEFAULT_CHORUS_CONFIG
        );

        delete();
    }

    /**
     * Creates a reverb processor
     */
    export function getReverbProcessor(
        context: BaseAudioContext,
        reverbBuffer: ?AudioBuffer = undefined
    ): { conv: ConvolverNode; promise: Promise<AudioBuffer> };

    export function audioBufferToWav(
        audioBuffer: AudioBuffer,
        normalizeAudio: boolean = true
    ): Blob;
}
