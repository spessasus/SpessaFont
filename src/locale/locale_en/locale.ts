import { MenuBarLocale } from "./menu_bar.ts";

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

    getUserInput: "Press anywhere to start the app",

    bankInfo: {
        name: "Bank's name",
        engineer: "Engineer",
        creationDate: "Creation Date",
        product: "Product",
        copyright: "Copyright",
        description: "Description",

        stats: "Stats:",
        version: "Version:",
        software: "Software:",
        engine: "Sound Engine:",

        samples: "Samples:",
        instruments: "Instruments:",
        presets: "Presets:",

        compressed: "Compressed:",
        count: "Count:",
        generatorCount: "Generator Count:",
        modulatorCount: "Modulator Count:",
        defaultModulators: "Default Modulators:"
    },

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
    menuBarLocale: MenuBarLocale
};
