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
        fullscreen: "Fullscreen",
        about: "About"
    },
    edit: {
        edit: "Edit",
        undo: "Undo",
        nothingToUndo: "Nothing to undo.",
        redo: "Redo",
        nothingToRedo: "Nothing to redo.",
        removeUnusedElements: "Remove Unused Elements",
        autoLinkSamples: "Auto-Link Stereo Samples"
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

    voices: "Voices:",
    settings: "Settings"
};
