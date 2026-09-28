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

// Translated by: 迎春心情（Yingchun Soul）

/**
 *
 */
export const localeChinese = {
    localeName: "简体中文",
    // title message
    titleMessage: "SpessaFont：在线SF2/DLS音色库编辑器",
    welcome: {
        main: "欢迎来到SpessaFont，在线SF2/DLS音色库编辑器！",
        openPrompt: "打开文件",
        newPrompt: "或新建文件……",
        downloadPrompt: "下载电脑版SpessaFont",
        copyright: "由Spessasus使用spessasynth_core创建。",
        copyrightTwo: `Copyright © Spessasus ${new Date().getFullYear()}，遵循 Apache-2.0 许可协议。`
    },
    poweredBy: "提供支持",
    firefox: "请使用火狐浏览器加载大文件。",
    getUserInput: "点击任意处启动应用。",

    unsavedChanges: "该文件有未保存的更改。",
    discard: "放弃更改",
    keep: "保留更改",

    loadingAndSaving: {
        loadingFileFromDisk: "正在从磁盘加载音色库……",
        parsingSoundBank: "正在解析音色库……",
        errorLoadingSoundBank: "加载音色库出错！",
        chromeError: "文件过大，Chromium内核的浏览器不受支持。",
        electronError: "该文件只能通过火狐浏览器使用网页版的SpessaFont打开。",

        savingSoundBank: "正在保存音色库……",
        savedSuccessfully: "保存完毕！",
        writingSamples: "正在写入采样……",
        writingFailed: "保存音色库出错！"
    },

    downloadDesktop: {
        chooseFormat: "选择格式",
        windowsInstaller: "Windows安装程序",
        windowsPortable: "Windows可移植版",
        linuxAppImage: "Linux AppImage",
        debianPackage: "Debian软件包"
    },

    error: "错误",
    yes: "是",
    no: "否",
    none: "无",
    githubPage: "项目页面",
    discord: "加入Discord群组！",
    keyboard: "键盘",

    // generic stuff
    addNew: "新增",
    copy: "复制",
    paste: "粘贴",
    delete: "删除",
    collapse: "收起",
    expand: "展开",

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
