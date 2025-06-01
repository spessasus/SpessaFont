import { Modulator } from "../../../soundfont/basic_soundfont/modulator.js";
import type { generatorTypes } from "spessasynth_core";

declare module "spessasynth_core" {
    /**
     * A class for dynamic modulators
     * that are assigned for more complex system exclusive messages
     */
    export class DynamicModulatorSystem {
        /**
         * the current dynamic modulator list
         * @type {{mod: Modulator, id: string}[]}
         */
        modulatorList: {
            mod: Modulator;
            id: string;
        }[];
        /**
         * @param id {string}
         * @private
         */
        private _deleteModulator;

        resetModulators(): void;

        /**
         * @param source {number}
         * @param destination {generatorTypes}
         * @param isBipolar {boolean}
         * @param isNegative {boolean}
         */
        _getModulatorId(
            source: number,
            destination: generatorTypes,
            isBipolar: boolean,
            isNegative: boolean
        ): string;

        /**
         * @param source {number} like in midiControllers: values below NON_CC_INDEX_OFFSET are CCs,
         * above are regular modulator sources
         * @param destination {generatorTypes}
         * @param amount {number}
         * @param isBipolar {boolean}
         * @param isNegative {boolean}
         */
        setModulator(
            source: number,
            destination: generatorTypes,
            amount: number,
            isBipolar?: boolean,
            isNegative?: boolean
        ): void;
    }
}
