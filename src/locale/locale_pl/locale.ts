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
export const localePolish = {
    localeName: "Polski",
    // title message
    titleMessage: "SpessaFont: Internetowy Edytor SoundFont2/DLS",
    welcome: {
        main: "Witamy w SpessaFont, internetowym edytorze SoundFont2/DLS!",
        openPrompt: "Otwórz plik, aby rozpocząć",
        newPrompt: "Lub zacznij z pustym plikiem...",
        downloadPrompt: "Pobierz SpessaFont Desktop",
        copyright: "Stworzone przez Spessasus używając spessasynth_core.",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}, Na licencji Apache-2.0.`
    },
    poweredBy: "Napędzane przez",
    firefox: "Rozważ użycie Firefox aby móc wczytywać duże pliki.",
    getUserInput: "Kliknij gdziekolwiek, aby uruchomić aplikację",

    unsavedChanges: "Ten plik ma niezapisane zmiany.",
    closeTab: "Zamknij {{name}}",
    discard: "Odrzuć",
    keep: "Zachowaj",

    errorBoundary: {
        title: "Coś poszło nie tak",
        description:
            "SpessaFont napotkał błąd i nie może kontynuować. Odświeżenie strony uruchomi aplikację ponownie. Niezapisane zmiany zostaną utracone.",
        reload: "Odśwież",
        paneTitle: "Ten edytor napotkał błąd",
        paneDescription:
            "Reszta SpessaFont nadal działa. Wybierz inny element lub cofnij ostatnią zmianę i wybierz ten ponownie.",
        actionFailed: "SpessaFont napotkał błąd. Szczegóły są powyżej."
    },

    loadingAndSaving: {
        loadingFileFromDisk: "Ładowanie pliku z dysku...",
        parsingSoundBank: "Przetwarzanie banku dźwięków...",
        errorLoadingSoundBank: "Błąd ładowania banku dźwięków!",
        chromeError:
            "Plik zbyt duży, aby być otwarty w przeglądarkach opartych na Chromium.",
        electronError:
            "Ten plik może zostać otwarty jedynie na SpessaFont Web w Firefoxie.",
        electronOpenError:
            "Nie udało się otworzyć {{name}}. Czy jesteś w trybie deweloperskim?",

        savingSoundBank: "Zapisywanie banku dźwięków...",
        savedSuccessfully: "Zapisano pomyślnie!",
        writingSamples: "Zapisywanie próbek dźwiękowych...",
        writingFailed: "Błąd podczas zapisu banku dźwięków!",
        unsupportedFile:
            "{{name}} nie jest bankiem dźwięków ani plikiem audio.",
        openBankForSamples:
            "Otwórz lub utwórz bank dźwięków, aby dodać do niego próbki."
    },

    downloadDesktop: {
        chooseFormat: "Wybierz format",
        windowsInstaller: "Instalator Windows",
        windowsPortable: "Windows Exe",
        linuxAppImage: "Linux AppImage",
        debianPackage: "Paczka Debiana"
    },

    error: "Błąd",
    yes: "Tak",
    no: "Nie",
    none: "Brak",
    githubPage: "Strona projektu",
    discord: "Dołącz do serwera Discord!",
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
    MIDIControllersLocale: MIDIControllersLocale,
    keyboardLocale: KeyboardLocale,

    sampleLocale: SampleLocale,
    instrumentLocale: InstrumentLocale,
    presetLocale: PresetLocale,
    soundBankLocale: SoundBankLocale,
    clipboardLocale: ClipboardLocale,
    contextMenu: ContextMenuLocale
};
