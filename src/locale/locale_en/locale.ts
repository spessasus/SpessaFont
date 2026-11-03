import { MenuBarLocale } from "./menu_bar.ts";
import { BankInfoLocale } from "./bank_info.ts";
import { PresetListLocale } from "./preset_list.ts";
import { ModulatorLocale } from "./modulator.ts";
import { GeneratorLocale } from "./generator.ts";
import { SettingsLocale } from "./settings.ts";
import { MIDIControllersLocale } from "./midi_controllers.ts";
import { SampleLocale } from "./sample.ts";
import { KeyboardLocale } from "./keyboard.ts";
import { SoundBankLocale } from "./sound_bank.ts";
import { InstrumentLocale } from "./instrument.ts";
import { PresetLocale } from "./preset.ts";
import { ClipboardLocale } from "./clipboard.ts";
import { ContextMenuLocale } from "./context_menu.ts";

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
        downloadPrompt: "Download SpessaFont Desktop",
        copyright: "Created by Spessasus using spessasynth_core.",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}, Licensed under the Apache-2.0 License.`
    },
    poweredBy: "Powered by",
    firefox: "Consider using Firefox to load large files.",
    getUserInput: "Press anywhere to start the app",

    unsavedChanges: "This file has unsaved changes.",
    closeTab: "Close {{name}}",
    discard: "Discard",
    keep: "Keep",

    errorBoundary: {
        title: "Something went wrong",
        description:
            "SpessaFont ran into an error and could not continue. Reloading the page restarts the app. Unsaved changes will be lost.",
        reload: "Reload",
        paneTitle: "This editor ran into an error",
        paneDescription:
            "The rest of SpessaFont still works. Select another element, or undo the last change and select this one again."
    },

    loadingAndSaving: {
        loadingFileFromDisk: "Loading file from disk...",
        parsingSoundBank: "Parsing sound bank...",
        errorLoadingSoundBank: "Error loading sound bank!",
        chromeError: "File too large to be opened on Chromium-based browsers.",
        electronError:
            "This file can only be opened in SpessaFont Web on Firefox.",
        electronOpenError:
            "Failed to open {{name}}. Are you in development mode?",

        savingSoundBank: "Saving sound bank...",
        savedSuccessfully: "Saved successfully!",
        writingSamples: "Writing Samples...",
        writingFailed: "Error writing the sound bank!"
    },

    downloadDesktop: {
        chooseFormat: "Choose format",
        windowsInstaller: "Windows Installer",
        windowsPortable: "Windows Portable",
        linuxAppImage: "Linux AppImage",
        debianPackage: "Debian Package"
    },

    error: "Error",
    yes: "Yes",
    no: "No",
    none: "None",
    githubPage: "Project page",
    discord: "Join the Discord server!",
    keyboard: "Keyboard",

    // generic stuff
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
    MIDIControllersLocale: MIDIControllersLocale,
    keyboardLocale: KeyboardLocale,

    sampleLocale: SampleLocale,
    instrumentLocale: InstrumentLocale,
    presetLocale: PresetLocale,
    soundBankLocale: SoundBankLocale,
    clipboardLocale: ClipboardLocale,
    contextMenu: ContextMenuLocale
};
