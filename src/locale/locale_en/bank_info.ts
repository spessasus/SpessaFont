export const BankInfoLocale = {
    name: "Bank's name",
    engineer: "Engineer",
    creationDate: "Creation Date",
    product: "Product",
    copyright: "Copyright",
    subject: "Subject",
    description: "Description",

    stats: "Information:",
    version: "Version:",
    software: "Software:",
    engine: "Sound Engine:",

    samples: "Samples:",
    instruments: "Instruments:",
    presets: "Presets:",
    unnamed: "Unnamed",

    compressed: "Compressed:",
    count: "Count:",
    generatorCount: "Generator Count:",
    modulatorCount: "Modulator Count:",
    defaultModulatorsForBank: "Default Modulators for <bank>{{name}}</bank>:",
    defaultModulators: "Default Modulators:",
    resetDefaultModulators: "Reset to Defaults",
    format: {
        label: "Format",
        sf2: "SoundFont 2",
        sfe: "SFe",
        hideSFeData:
            "This bank uses SFe generators or modulators. SoundFont 2 mode hides them, and saving as anything other than SFe removes them!",
        switchToSF2: "Switch to SoundFont 2",
        switchedOnPaste:
            "What you added uses SFe data, so the bank is now in SFe mode.",
        switchedOnSave: "Saved as SFe, so the bank is now in SFe mode."
    },
    checkButton: "Problems:",
    check: {
        title: "Problems: {{count}}",
        noIssues: "Nothing found. The bank looks fine.",
        duplicatePatch:
            "These presets share the patch {{patch}}, so only one plays:",
        duplicateZone: "Plays {{zone}} twice the same way:",
        emptyElement: "Has no zones and plays nothing:",
        unusedInstrument: "Not used by any preset:",
        unusedSample: "Not used by any instrument:",
        loopOutside: "The loop goes past the end of the sample:",
        fixLoop: "Fix the loop",
        stereoOneSided: "Linked to a sample that is not linked back:",
        stereoRate: "A stereo pair with different sample rates:",
        stereoLength: "A stereo pair with different lengths:",
        longName:
            "Longer than {{length}} characters. Players other than SpessaSynth show only the first {{length}} in SF2 and SF3 files:",
        cutName:
            "Longer than {{length}} characters, which SF2, SF3 and SFe saves cut (DLS keeps the whole name):",
        nonLatin1Name: "Has characters that saved files cannot keep:",
        nonLatin1Info:
            "The bank information has characters that saved files cannot keep.",
        bankNumberLost: "Has bank numbers that an SF2 or SF3 save changes:",
        sfeOnlyData:
            "Uses SFe generators, modulators or loops, which only SFe saves keep:",
        sfeDefaultModulators:
            "Some default modulators use SFe generators or curves, which only SFe saves keep.",
        linkedModulator:
            "Has linked modulators, which SpessaSynth does not play and a save breaks:",
        showAll: "Show all {{count}}"
    }
};
