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
 * Translated by SamuelLouf <https://github.com/samuellouf>
 */
export const localeFrench = {
    localeName: "Français",
    // title message
    titleMessage: "SpessaFont: Un éditeur de SoundFont2/DLS en ligne",
    welcome: {
        main: "Bienvenue sur SpessaFont, un éditeur de SoundFont2/DLS en ligne!",
        openPrompt: "Ouvrir un fichier",
        newPrompt: "Ou commencer avec un fichier vide...",
        copyright: "Créé par Spessasus avec spessasynth_core.",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}, Licencié sous la Licence Apache-2.0.`
    },
    poweredBy: "Fonctionne grâce à",
    firefox: "Firefox permet de charger des fichiers plus lourds.",
    getUserInput: "Appuyez n'importe où pour démmarrer l'application",

    unsavedChanges: "Ce fichier a des modifications non enregistrées.",
    discard: "Ignorer",
    keep: "Garder",

    loadingAndSaving: {
        loadingFileFromDisk: "Chargement d'un fichier depuis le disque...",
        parsingSoundBank: "Analyse de la Banque de Son...",
        errorLoadingSoundBank: "Il y a eu une erreur lors du chargement de la Banque de Son!",
        chromeError: "Le fichier est trop lourd pour être ouvert sur des navigateurs basés sur Chromium.",

        savingSoundBank: "En train d'enregistrer la banque sonore...",
        savedSuccessfully: "Enregistré avec succès!",
        writingSamples: "En train d'écrire les échantillons...",
        writingFailed: "Il y a eu une erreur lors de l'écriture de la Banque de Son!"
    },

    error: "Erreur",
    yes: "Oui",
    no: "Non",
    none: "Aucun",
    githubPage: "Page GitHub du projet",
    discord: "Rejoindre le serveur Discord!",
    keyboard: "Clavier",

    // generic stuff
    addNew: "Ajouter",
    copy: "Copier",
    paste: "Coller",
    delete: "Supprimer",
    collapse: "Masquer",
    expand: "Afficher",

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
