import type { SoundBankManager } from "spessasynth_core";

declare module "spessasynth_core" {
    export class SoundFontManager {
        /**
         * All the soundfonts, ordered from the most important to the least.
         * @type {SoundFontType[]}
         */
        soundfontList: SoundFontType[];
        /**
         * @type {{bank: number, presetName: string, program: number}[]}
         */
        presetList: {
            bank: number;
            presetName: string;
            program: number;
        }[];
        presetListChangeCallback: () => unknown;

        /**
         * @param presetListChangeCallback {function} to call when stuff changes
         */
        constructor(presetListChangeCallback: () => unknown);

        generatePresetList(): void;

        /**
         * Get the final preset list
         * @returns {{bank: number, presetName: string, program: number}[]}
         */
        getPresetList(): {
            bank: number;
            presetName: string;
            program: number;
        }[];

        /**
         * Clears all soundfonts and adds a new one with an ID "main"
         * @param soundFont {SoundBankManager}
         */
        reloadManager(soundFont: SoundBankManager): void;

        /**
         * Deletes a given soundfont.
         * @param id {string}
         */
        deleteSoundFont(id: string): void;

        /**
         * Adds a new soundfont with a given ID
         * @param font {SoundBankManager}
         * @param id {string}
         * @param bankOffset {number}
         */
        addNewSoundFont(
            font: SoundBankManager,
            id: string,
            bankOffset: number
        ): void;

        /**
         * Gets the current soundfont order
         * @returns {string[]}
         */
        getCurrentSoundFontOrder(): string[];

        /**
         * Rearranges the soundfonts
         * @param newList {string[]} the order of soundfonts, a list of strings, first overwrites second
         */
        rearrangeSoundFonts(newList: string[]): void;

        /**
         * Gets a given preset from the soundfont stack
         * @param bankNumber {number}
         * @param programNumber {number}
         * @param allowXGDrums {boolean} if true, allows XG drum banks (120, 126 and 127) as drum preset
         * @returns {{preset: BasicPreset, bankOffset: number}} the preset and its bank offset
         */
        getPreset(
            bankNumber: number,
            programNumber: number,
            allowXGDrums?: boolean
        ): {
            preset: BasicPreset;
            bankOffset: number;
        };

        destroyManager(): void;
    }

    export type SoundFontType = {
        /**
         * - unique id for the soundfont
         */
        id: string;
        /**
         * - the soundfont itself
         */
        soundfont: BasicSoundBank;
        /**
         * - the soundfont's bank offset
         */
        bankOffset: number;
    };
}
