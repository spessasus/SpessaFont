import type { HistoryLabel } from "../core_backend/history_label.ts";

/**
 * The locale key that names each history label, spelled out so the keys stay greppable.
 */
export const HISTORY_LABEL_KEYS = {
    addInstrument: "menuBarLocale.history.addInstrument",
    addPreset: "menuBarLocale.history.addPreset",
    addSample: "menuBarLocale.history.addSample",
    addZone: "menuBarLocale.history.addZone",
    changeAudio: "menuBarLocale.history.changeAudio",
    changePatch: "menuBarLocale.history.changePatch",
    changeFormat: "menuBarLocale.history.changeFormat",
    changeSampleType: "menuBarLocale.history.changeSampleType",
    convertSamples: "menuBarLocale.history.convertSamples",
    deleteInstrument: "menuBarLocale.history.deleteInstrument",
    deletePreset: "menuBarLocale.history.deletePreset",
    deleteSample: "menuBarLocale.history.deleteSample",
    deleteZone: "menuBarLocale.history.deleteZone",
    editBankInfo: "menuBarLocale.history.editBankInfo",
    editDefaultModulators: "menuBarLocale.history.editDefaultModulators",
    editGenerator: "menuBarLocale.history.editGenerator",
    editModulators: "menuBarLocale.history.editModulators",
    editRange: "menuBarLocale.history.editRange",
    editSample: "menuBarLocale.history.editSample",
    renameInstrument: "menuBarLocale.history.renameInstrument",
    renamePreset: "menuBarLocale.history.renamePreset",
    renameSample: "menuBarLocale.history.renameSample",
    replaceZoneChild: "menuBarLocale.history.replaceZoneChild",
    splitZones: "menuBarLocale.history.splitZones"
} as const satisfies Record<HistoryLabel, string>;
