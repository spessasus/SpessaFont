import type { Voice } from "./voice";

export class ModulationEnvelope {
    /**
     * The attack duration, in seconds
     * @type {number}
     */
    attackDuration: number;
    /**
     * The decay duration, in seconds
     * @type {number}
     */
    decayDuration: number;
    /**
     * The hold duration, in seconds
     * @type {number}
     */
    holdDuration: number;
    /**
     * Release duration, in seconds
     * @type {number}
     */
    releaseDuration: number;
    /**
     * The sustain level 0-1
     * @type {number}
     */
    sustainLevel: number;
    /**
     * Delay phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    delayEnd: number;
    /**
     * Attack phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    attackEnd: number;
    /**
     * Hold phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    holdEnd: number;
    /**
     * Decay phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    decayEnd: number;
    /**
     * The level of the envelope when the release phase starts
     * @type {number}
     */
    releaseStartLevel: number;
    /**
     * The current modulation envelope value
     * @type {number}
     */
    currentValue: number;

    /**
     * Starts the release phase in the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static startRelease(voice: Voice): void;

    /**
     * @param voice {Voice} the voice to recalculate
     */
    static recalculate(voice: Voice): void;

    /**
     * Calculates the current modulation envelope value for the given time and voice
     * @param voice {Voice} the voice we are working on
     * @param currentTime {number} in seconds
     * @param ignoreRelease {boolean} if true, it will compute the value as if the voice was not released
     * @returns {number} modenv value, from 0 to 1
     */
    static getValue(
        voice: Voice,
        currentTime: number,
        ignoreRelease?: boolean
    ): number;
}
