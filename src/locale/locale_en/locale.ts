import { MenuBarLocale } from "./menu_bar.ts";
import { BankInfoLocale } from "./bank_info.ts";
import { PresetListLocale } from "./preset_list.ts";
import { ModulatorLocale } from "./modulator.ts";
import { GeneratorLocale } from "./generator.ts";
import { SettingsLocale } from "./settings.ts";
import { MidiControllersLocale } from "./midi_controllers.ts";

/**
 *
 */
export const localeEnglish = {
    localeName: "English",
    // title message
    titleMessage: "SpessaFont: Online SoundFont2/DLS Editor",
    welcome: {
        main: "Welcome to SpessaFont, an online SoundFont2/DLS Editor!",
        prompt: "Click File -> New, or File -> Open to get started!",
        copyright:
            "Created by Spessasus using spessasynth_core and spessasynth_lib."
    },
    poweredBy: "Powered by",
    firefox: "Consider using Firefox for the best performance",
    unsavedChanges: "This file has unsaved changes.",
    getUserInput: "Press anywhere to start the app",

    synthInit: {
        genericLoading: "Loading...",
        loadingSoundfont: "Loading SoundFont...",
        loadingBundledSoundfont: "Loading bundled SoundFont...",
        startingSynthesizer: "Starting Synthesizer...",
        savingSoundfont: "Saving SoundFont for reuse...",
        noWebAudio: "Your browser does not support Web Audio.",
        done: "Ready!"
    },

    error: "Error",
    yes: "Yes",
    no: "No",
    none: "None",
    githubPage: "Project page",
    keyboard: "Keyboard",
    menuBarLocale: MenuBarLocale,
    modulatorLocale: ModulatorLocale,
    generatorLocale: GeneratorLocale,
    bankInfo: BankInfoLocale,
    presetList: PresetListLocale,
    settingsLocale: SettingsLocale,
    midiControllersLocale: MidiControllersLocale
};
