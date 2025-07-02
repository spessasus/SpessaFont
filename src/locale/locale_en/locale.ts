import { MenuBarLocale } from "./menu_bar.ts";
import { BankInfoLocale } from "./bank_info.ts";
import { PresetListLocale } from "./preset_list.ts";
import { ModulatorLocale } from "./modulator.ts";
import { GeneratorLocale } from "./generator.ts";
import { SettingsLocale } from "./settings.ts";
import { MidiControllersLocale } from "./midi_controllers.ts";
import { SampleLocale } from "./sample.ts";
import { KeyboardLocale } from "./keyboard.ts";
import { SoundBankLocale } from "./sound_bank.ts";
import { InstrumentLocale } from "./instrument.ts";
import { PresetLocale } from "./preset.ts";

/**
 *
 */
export const localeEnglish = {
    localeName: "English",
    // title message
    titleMessage: "SpessaFont: Online SoundFont2/DLS Editor",
    welcome: {
        main: "Welcome to SpessaFont, an online SoundFont2/DLS Editor!",
        openPrompt: "Open a file to get started",
        newPrompt: "Or start with an empty file...",
        copyright:
            "Created by Spessasus using spessasynth_core and spessasynth_lib.",
        copyrightTwo:
            "Copyright © Spessasus 2025, Licensed under the Apache-2.0 License."
    },
    poweredBy: "Powered by",
    firefox: "Consider using Firefox for the best performance",
    getUserInput: "Press anywhere to start the app",

    unsavedChanges: "This file has unsaved changes.",
    discard: "Discard",
    keep: "Keep",

    loadingAndSaving: {
        loadingFileFromDisk: "Loading file from disk...",
        parsingSoundBank: "Parsing sound bank...",
        errorLoadingSoundBank: "Error loading sound bank!",
        chromeError: "File too large to be opened on Chromium-based browsers.",

        savingSoundBank: "Saving sound bank...",
        savedSuccessfully: "Saved successfully!",
        writingSamples: "Writing Samples..."
    },

    error: "Error",
    yes: "Yes",
    no: "No",
    none: "None",
    githubPage: "Project page",
    keyboard: "Keyboard",

    addNew: "Add New",
    copy: "Copy",
    paste: "Paste",
    delete: "Delete",
    collapse: "Collapse",
    expand: "Expand",

    menuBarLocale: MenuBarLocale,
    modulatorLocale: ModulatorLocale,
    generatorLocale: GeneratorLocale,
    bankInfo: BankInfoLocale,
    presetList: PresetListLocale,
    settingsLocale: SettingsLocale,
    midiControllersLocale: MidiControllersLocale,
    keyboardLocale: KeyboardLocale,

    sampleLocale: SampleLocale,
    instrumentLocale: InstrumentLocale,
    presetLocale: PresetLocale,
    soundBankLocale: SoundBankLocale
};
