/**
 * What an edit does, as the Edit menu names it ("Undo Rename Preset").
 */
export type HistoryLabel =
    | "addInstrument"
    | "addPreset"
    | "addSample"
    | "addZone"
    | "changeAudio"
    | "changePatch"
    | "changeFormat"
    | "changeSampleType"
    | "convertSamples"
    | "deleteInstrument"
    | "deletePreset"
    | "deleteSample"
    | "deleteZone"
    | "editBankInfo"
    | "editDefaultModulators"
    | "editGenerator"
    | "editModulators"
    | "editRange"
    | "editSample"
    | "renameInstrument"
    | "renamePreset"
    | "renameSample"
    | "replaceZoneChild"
    | "splitZones";
