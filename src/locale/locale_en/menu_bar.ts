export const MenuBarLocale = {
    file: {
        file: "File",
        new: "New",
        open: "Open",
        close: "Close",
        save: "Save",
        saveSF2: "Save SF2",
        saveDLS: "Save DLS",
        saveSF3: "Save SF3",
        saveSFE: "Save SFE",
        warnSF2:
            "This sound bank contains compressed samples. " +
            "Saving it as SF2 will result in quality loss. Are you sure you want to continue?",
        warnText:
            "Some names or bank details use characters outside Latin-1 (like ą, ż or 日). " +
            "Sound bank files cannot store them, so they will be saved wrong. Are you sure you want to continue?",
        warnSFEData:
            "This sound bank uses SpessaSynth generators or modulators that only SFE files store. " +
            "Saving it as {{format}} will leave them out. Are you sure you want to continue?",
        warnBankNumbers:
            "Some drum kits set a bank MSB or LSB, or some presets set both. " +
            "{{format}} files cannot store them, so those presets will be saved with other bank numbers. Are you sure you want to continue?",
        warnDLS:
            "This sound bank has {{losses}}, which DLS files cannot store. " +
            "Saving it as DLS will leave them out. Are you sure you want to continue?",
        warnSubject:
            "This sound bank has a subject, which {{format}} files have no place for. " +
            "Saving it as {{format}} adds the subject to the end of the description. Are you sure you want to continue?",
        warnDefaultModulators:
            "This sound bank has edited default modulators. Only players based on SpessaSynth use them, " +
            "others play it with the standard ones. Are you sure you want to continue?",
        dlsLossStereoLinks: "linked stereo samples",
        dlsLossUnusedInstruments: "instruments no preset uses",
        dlsLossDefaultModulators: "edited default modulators",
        warn24Bit:
            "The file of this sound bank has 24-bit samples. SpessaFont keeps 16 bits of them, " +
            "so the saved file loses the rest. Are you sure you want to continue?",
        fullscreen: "Fullscreen",
        about: "About"
    },
    edit: {
        edit: "Edit",
        undo: "Undo",
        undoWhat: "Undo {{what}}",
        redoWhat: "Redo {{what}}",
        undone: "Undone: {{what}}",
        redone: "Redone: {{what}}",
        nothingToUndo: "Nothing to undo.",
        redo: "Redo",
        nothingToRedo: "Nothing to redo.",
        removeUnusedElements: "Remove Unused Elements",
        autoLinkSamples: "Auto-Link Stereo Samples",
        mergeDuplicateSamples: "Merge Duplicate Samples"
    },
    history: {
        addInstrument: "Add Instrument",
        addPreset: "Add Preset",
        addSample: "Add Sample",
        addZone: "Add Zone",
        changeAudio: "Change Audio",
        changePatch: "Change Patch",
        changeSampleType: "Change Sample Type",
        convertSamples: "Convert Samples",
        deleteInstrument: "Delete Instrument",
        deletePreset: "Delete Preset",
        deleteSample: "Delete Sample",
        deleteZone: "Delete Zone",
        editBankInfo: "Edit Bank Info",
        editDefaultModulators: "Edit Default Modulators",
        editGenerator: "Edit Generator",
        editModulators: "Edit Modulators",
        editRange: "Edit Range",
        editSample: "Edit Sample",
        renameInstrument: "Rename Instrument",
        renamePreset: "Rename Preset",
        renameSample: "Rename Sample",
        replaceZoneChild: "Replace Zone Element",
        splitZones: "Split Zones"
    },
    midi: {
        player: "MIDI Player",
        play: "Play MIDI",
        pause: "Pause",
        resume: "Resume",
        loadError: "Could not load {{name}}.",
        noName: "No name",
        rewind: "Jump back a little"
    },

    voices: "Voices:"
};
