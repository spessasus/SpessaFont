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
import { ClipboardLocale } from "./clipboard.ts";

/**
 *
 */
export const localePolish = {
    localeName: "Polski",
    // title message
    titleMessage: "SpessaFont: Internetowy Edytor SoundFont2/DLS",
    welcome: {
        main: "Witamy w SpessaFont, internetowym edytorze SoundFont2/DLS!",
        openPrompt: "Otwórz plik, aby rozpocząć",
        newPrompt: "Lub zacznij z pustym plikiem...",
        copyright:
            "Stworzone przez Spessasus używając spessasynth_core i spessasynth_lib.",
        copyrightTwo: "Copyright © Spessasus 2025, Na licencji Apache-2.0."
    },
    poweredBy: "Napędzane przez",
    firefox: "Rozważ użycie Firefox aby móc wczytywać duże pliki.",
    getUserInput: "Kliknij gdziekolwiek, aby uruchomić aplikację",

    unsavedChanges: "Ten plik ma niezapisane zmiany.",
    discard: "Odrzuć",
    keep: "Zachowaj",

    loadingAndSaving: {
        loadingFileFromDisk: "Ładowanie pliku z dysku...",
        parsingSoundBank: "Przetwarzanie banku dźwięków...",
        errorLoadingSoundBank: "Błąd ładowania banku dźwięków!",
        chromeError:
            "Plik zbyt duży, aby być otwarty w przeglądarkach opartych na Chromium.",

        savingSoundBank: "Zapisywanie banku dźwięków...",
        savedSuccessfully: "Zapisano pomyślnie!",
        writingSamples: "Zapisywanie próbek dźwiękowych..."
    },

    error: "Błąd",
    yes: "Tak",
    no: "Nie",
    none: "Brak",
    githubPage: "Strona projektu",
    keyboard: "Klawiatura",

    addNew: "Dodaj nowy",
    copy: "Kopiuj",
    paste: "Wklej",
    delete: "Usuń",
    collapse: "Zwiń",
    expand: "Rozwiń",

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
    soundBankLocale: SoundBankLocale,
    clipboardLocale: ClipboardLocale
};
