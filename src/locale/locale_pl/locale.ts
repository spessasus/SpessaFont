import { MenuBarLocale } from "./menu_bar.ts";
import { BankInfoLocale } from "./bank_info.ts";
import { PresetListLocale } from "./preset_list.ts";
import { ModulatorLocale } from "./modulator.ts";
import { GeneratorLocale } from "./generator.ts";
import { SettingsLocale } from "./settings.ts";

export const localePolish = {
    localeName: "Polski",
    // title message
    titleMessage: "SpessaFont: Edytor SoundFont2/DLS online",
    welcome: {
        main: "Witaj w SpessaFont, edytorze SoundFont2/DLS online!",
        prompt: "Kliknij Plik -> Nowy, lub Plik -> Otwórz, aby rozpocząć!",
        copyright:
            "Stworzone przez Spessasus używając spessasynth_core i spessasynth_lib."
    },
    poweredBy: "Zasilone przez",
    firefox: "Rozważ użycie Firefoxa dla najlepszej wydajności",

    getUserInput: "Kliknij gdziekolwiek, aby uruchomić aplikację",

    synthInit: {
        genericLoading: "Ładowanie...",
        loadingSoundfont: "Ładowanie SoundFont...",
        loadingBundledSoundfont: "Ładowanie dołączonego SoundFont...",
        startingSynthesizer: "Uruchamianie Syntezatora...",
        savingSoundfont: "Zapisywanie SoundFont do ponownego użycia...",
        noWebAudio: "Twoja przeglądarka nie wspiera Web Audio.",
        done: "Gotowe!"
    },

    error: "Błąd",
    yes: "Tak",
    no: "Nie",
    none: "Brak",
    githubPage: "Strona projektu",
    menuBarLocale: MenuBarLocale,
    modulatorLocale: ModulatorLocale,
    generatorLocale: GeneratorLocale,
    bankInfo: BankInfoLocale,
    presetList: PresetListLocale,
    settingsLocale: SettingsLocale
};
