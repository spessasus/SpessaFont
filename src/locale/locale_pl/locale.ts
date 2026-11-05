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
import { ToolsLocale } from "./tools.ts";

/**
 *
 */
export const localePolish = {
    // title message
    titleMessage: "SpessaFont: Internetowy Edytor SoundFont2/DLS",
    welcome: {
        main: "Witamy w SpessaFont, internetowym edytorze SoundFont2/DLS!",
        openPrompt: "Otwórz plik, aby rozpocząć",
        newPrompt: "Lub zacznij z pustym plikiem…",
        downloadPrompt: "Pobierz SpessaFont Desktop",
        copyright: "Stworzone przez Spessasus przy użyciu spessasynth_core.",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}, Na licencji Apache-2.0.`
    },
    poweredBy: "Napędzane przez",
    firefox: "Rozważ użycie Firefoksa, aby móc wczytywać duże pliki.",
    getUserInput: "Kliknij gdziekolwiek, aby uruchomić aplikację",

    unsavedBanksTitle: "Niezapisane zmiany",
    unsavedBanksMessage:
        "Niektóre banki dźwięków mają niezapisane zmiany. Odrzucić je?",
    bankHasUnsavedChanges: "{{name}} ma niezapisane zmiany.",
    openBanks: "Otwarte banki dźwięków",
    closeTab: "Zamknij {{name}}",
    saveAndClose: "Zapisz i zamknij",
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
        actionFailed: "SpessaFont napotkał błąd. Szczegóły są powyżej.",
        partTitle: "Ta część SpessaFont napotkała błąd",
        partDescription:
            "Reszta SpessaFont nadal działa, a twoje banki pozostają otwarte. Spróbuj ponownie lub zapisz banki i odśwież stronę.",
        tryAgain: "Spróbuj ponownie"
    },

    loadingAndSaving: {
        loadingFileFromDisk: "Ładowanie pliku z dysku…",
        creatingNewBank: "Tworzenie nowego banku dźwięków…",
        parsingSoundBank: "Przetwarzanie banku dźwięków…",
        errorLoadingSoundBank: "Błąd ładowania banku dźwięków!",
        undecodableSamples_one:
            "Nie udało się zdekodować {{count}} próbki, więc gra ciszę. Zapis w formacie SF2 lub DLS zamieni ją w tę ciszę.",
        undecodableSamples_few:
            "Nie udało się zdekodować {{count}} próbek, więc grają ciszę. Zapis w formacie SF2 lub DLS zamieni je w tę ciszę.",
        undecodableSamples_many:
            "Nie udało się zdekodować {{count}} próbek, więc grają ciszę. Zapis w formacie SF2 lub DLS zamieni je w tę ciszę.",
        undecodableSamples_other:
            "Nie udało się zdekodować {{count}} próbki, więc grają ciszę. Zapis w formacie SF2 lub DLS zamieni je w tę ciszę.",
        chromeError:
            "Plik zbyt duży, aby być otwarty w przeglądarkach opartych na Chromium.",
        electronError:
            "Ten plik może zostać otwarty jedynie na SpessaFont Web w Firefoxie.",
        electronOpenError: "Nie udało się otworzyć {{name}}.",

        savingSoundBank: "Zapisywanie banku dźwięków…",
        savedSuccessfully: "Zapisano pomyślnie!",
        writingSamplesProgress:
            "Zapisywanie próbek dźwiękowych… ({{percent}}%)",
        writingFailed: "Błąd podczas zapisu banku dźwięków!",
        encoderUnavailable:
            "Nie udało się załadować kodera Vorbis dla SF3. Sprawdź połączenie i spróbuj ponownie.",
        dlsTooLarge:
            "Preset ma zbyt wiele stref, aby zapisać go jako DLS, gdzie każda para strefy presetu i strefy instrumentu staje się osobnym regionem. Użyj mniejszej liczby stref lub zapisz w innym formacie.",
        saveRunning: "Ten bank dźwięków jest już zapisywany.",
        unsupportedFile:
            "{{name}} nie jest bankiem dźwięków ani plikiem audio.",
        openBankForSamples:
            "Otwórz lub utwórz bank dźwięków, aby dodać do niego próbki."
    },

    downloadDesktop: {
        chooseFormat: "Wybierz format",
        windowsInstaller: "Instalator Windows",
        windowsPortable: "Windows (wersja przenośna)",
        linuxAppImage: "Linux AppImage",
        debianPackage: "Pakiet Debiana"
    },

    yes: "Tak",
    no: "Nie",
    githubPage: "Strona projektu",
    discord: "Dołącz do serwera Discord!",
    keyboard: "Klawiatura",

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
    contextMenu: ContextMenuLocale,
    toolsLocale: ToolsLocale
};
