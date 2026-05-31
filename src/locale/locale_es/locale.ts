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

/**
 *
 */
export const localeSpanish = {
    localeName: "Español",
    // title message
    titleMessage: "SpessaFont: Editor en Línea de SoundFont2/DLS",
    welcome: {
        main: "¡Bienvenido a SpessaFont, un Editor en Línea de SoundFont2/DLS!",
        openPrompt: "Abre un archivo para comenzar",
        newPrompt: "O comienza con un archivo vacío...",
        downloadPrompt: "Descargar SpessaFont de Escritorio",
        copyright: "Creado por Spessasus utilizando spessasynth_core.",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}, Licenciado bajo la Licencia Apache-2.0.`
    },
    poweredBy: "Impulsado por",
    firefox: "Considera usar Firefox para cargar archivos grandes.",
    getUserInput: "Presiona en cualquier lugar para iniciar la aplicación",

    unsavedChanges: "Este archivo tiene cambios sin guardar.",
    discard: "Descartar",
    keep: "Mantener",

    loadingAndSaving: {
        loadingFileFromDisk: "Cargando archivo del disco...",
        parsingSoundBank: "Analizando banco de sonido...",
        errorLoadingSoundBank: "¡Error al cargar banco de sonido!",
        chromeError:
            "Archivo demasiado grande para ser abierto en navegadores basados en Chromium.",
        electronError:
            "Este archivo solo se puede abrir en SpessaFont Web en Firefox.",

        savingSoundBank: "Guardando banco de sonido...",
        savedSuccessfully: "¡Guardado correctamente!",
        writingSamples: "Escribiendo Muestras...",
        writingFailed: "¡Error escribiendo el banco de sonido!"
    },

    downloadDesktop: {
        chooseFormat: "Elegir formato",
        windowsInstaller: "Instalador de Windows",
        windowsPortable: "Windows Portátil",
        linuxAppImage: "Linux AppImage",
        debianPackage: "Paquete Debian"
    },

    error: "Error",
    yes: "Sí",
    no: "No",
    none: "Ninguno",
    githubPage: "Página del Proyecto",
    discord: "¡Únete al servidor de Discord!",
    keyboard: "Teclado",

    // generic stuff
    addNew: "Agregar Nuevo",
    copy: "Copiar",
    paste: "Pegar",
    delete: "Eliminar",
    collapse: "Contraer",
    expand: "Expandir",

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
    clipboardLocale: ClipboardLocale
};
