import type { Voice } from "./voice";

export class VolumeEnvelope {
    /**
     * The envelope's current time in samples
     * @type {number}
     */
    currentSampleTime: number;
    /**
     * The sample rate in Hz
     * @type {number}
     */
    sampleRate: number;
    /**
     * The current attenuation of the envelope in dB
     * @type {number}
     */
    currentAttenuationDb: number;
    /**
     * The current stage of the volume envelope
     * @type {0|1|2|3|4}
     */
    state: 0 | 1 | 2 | 3 | 4;
    /**
     * The dB attenuation of the envelope when it entered the release stage
     * @type {number}
     */
    releaseStartDb: number;
    /**
     * The time in samples relative to the start of the envelope
     * @type {number}
     */
    releaseStartTimeSamples: number;
    /**
     * The current gain applied to the voice in the release stage
     * @type {number}
     */
    currentReleaseGain: number;
    /**
     * The attack duration in samples
     * @type {number}
     */
    attackDuration: number;
    /**
     * The decay duration in samples
     * @type {number}
     */
    decayDuration: number;
    /**
     * The release duration in samples
     * @type {number}
     */
    releaseDuration: number;
    /**
     * The voice's absolute attenuation as linear gain
     * @type {number}
     */
    attenuation: number;
    /**
     * The attenuation target, which the "attenuation" property is linearly interpolated towards (gain)
     * @type {number}
     */
    attenuationTargetGain: number;
    /**
     * The attenuation target, which the "attenuation" property is linearly interpolated towards (dB)
     * @type {number}
     */
    attenuationTarget: number;
    /**
     * The voice's sustain amount in dB, relative to attenuation
     * @type {number}
     */
    sustainDbRelative: number;
    /**
     * The time in samples to the end of delay stage, relative to the start of the envelope
     * @type {number}
     */
    delayEnd: number;
    /**
     * The time in samples to the end of attack stage, relative to the start of the envelope
     * @type {number}
     */
    attackEnd: number;
    /**
     * The time in samples to the end of hold stage, relative to the start of the envelope
     * @type {number}
     */
    holdEnd: number;
    /**
     * The time in samples to the end of decay stage, relative to the start of the envelope
     * @type {number}
     */
    decayEnd: number;
    /**
     * if sustain stage is silent,
     * then we can turn off the voice when it is silent.
     * We can't do that with modulated as it can silence the volume and then raise it again, and the voice must keep playing
     * @type {boolean}
     */
    canEndOnSilentSustain: boolean;

    /**
     * @param sampleRate {number} Hz
     * @param initialDecay {number} cb
     */
    constructor(sampleRate: number, initialDecay: number);

    /**
     * Starts the release phase in the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static startRelease(voice: Voice): void;

    /**
     * Recalculates the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static recalculate(voice: Voice): void;

    /**
     * Applies volume envelope gain to the given output buffer
     * @param voice {Voice} the voice we're working on
     * @param audioBuffer {Float32Array} the audio buffer to modify
     * @param centibelOffset {number} the centibel offset of volume, for modLFOtoVolume
     * @param smoothingFactor {number} the adjusted smoothing factor for the envelope
     * @description essentially we use approach of 100dB is silence, 0dB is peak, and always add attenuation to that (which is interpolated)
     */
    static apply(
        voice: Voice,
        audioBuffer: Float32Array,
        centibelOffset: number,
        smoothingFactor: number
    ): void;
}
