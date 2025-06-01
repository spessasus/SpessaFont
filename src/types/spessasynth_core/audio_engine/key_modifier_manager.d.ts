declare module "spessasynth_core" {
    /**
     * A manager for custom key overrides for channels
     */
    export class KeyModifier {
        /**
         * The new override velocity. -1 means unchanged
         * @type {number}
         */
        velocity: number;
        /**
         * The patch this key uses. -1 on either means default
         * @type {{bank: number, program: number}}
         */
        patch: {
            bank: number;
            program: number;
        };
        /**
         * Linear gain override for the voice
         */
        gain: number;

        /**
         * @param velocity {number}
         * @param bank {number}
         * @param program {number}
         * @param gain {number}
         */
        constructor(
            velocity?: number,
            bank?: number,
            program?: number,
            gain?: number
        );
    }

    export class KeyModifierManager {
        /**
         * The velocity override mappings for MIDI keys
         * stored as [channelNumber][midiNote]
         * @type {KeyModifier[][]}
         * @private
         */
        private _keyMappings: KeyModifier[][];

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @param mapping {KeyModifier}
         */
        addMapping(
            channel: number,
            midiNote: number,
            mapping: KeyModifier
        ): void;

        /**
         * @param channel {number}
         * @param midiNote {number}
         */
        deleteMapping(channel: number, midiNote: number): void;

        /**
         * Clear all mappings
         */
        clearMappings(): void;

        /**
         * @param mappings {KeyModifier[][]}
         */
        setMappings(mappings: KeyModifier[][]): void;

        /**
         * @returns {KeyModifier[][]}
         */
        getMappings(): KeyModifier[][];

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @returns {number} velocity, -1 if unchanged
         */
        getVelocity(channel: number, midiNote: number): number;

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @returns {number} linear gain
         */
        getGain(channel: number, midiNote: number): number;

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @returns {boolean}
         */
        hasOverridePatch(channel: number, midiNote: number): boolean;

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @returns {{bank: number, program: number}} -1 if unchanged
         */
        getPatch(
            channel: number,
            midiNote: number
        ): {
            bank: number;
            program: number;
        };
    }
}
