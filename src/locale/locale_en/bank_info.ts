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
    defaultModulatorsFor: "Default Modulators for",
    defaultModulators: "Default Modulators:",
    checkButton: "Bank Check:",
    check: {
        title: "Bank Check: {{count}} found",
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
            "Longer than {{length}} characters, which is what SF2 and SF3 keep:",
        nonLatin1Name: "Has characters that saved files cannot keep:"
    }
};
