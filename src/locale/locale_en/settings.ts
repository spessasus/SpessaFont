export const SettingsLocale = {
    settings: "Settings",
    closeSettings: "Close the settings",
    interface: {
        title: "Interface Settings",
        language: "Language",
        browserLanguage: "Browser language ({{name}})",
        theme: "Theme",
        dark: "Dark",
        light: "Light",
        layout: "Layout",
        layoutAuto: "Automatic",
        layoutPhone: "Phone",
        layoutDesktop: "Desktop"
    },
    audioEngine: {
        title: "Audio Engine Settings",
        sampleRate: "Sample Rate",
        sampleRateRejected:
            "This browser does not support a sample rate of {{rate}} Hz, so {{fallback}} Hz is used.",
        sampleRateReload:
            "Changing the sample rate reloads the page and closes every open bank.",
        sampleRateUnsaved_one:
            "Unsaved changes in {{count}} bank will be lost.",
        sampleRateUnsaved_other:
            "Unsaved changes in {{count}} banks will be lost.",
        reloadWithRate: "Reload at {{rate}} Hz",
        keepRate: "Keep {{rate}} Hz",
        workerFailed:
            "The synthesizer could not start in the background, so it runs on the page. Busy moments may cause dropouts.",
        hostFailed:
            "The synthesizer failed: {{message}}. What plays and what gets saved may differ from what is shown, so save a copy and reload the page.",
        volume: "Volume",
        voiceCap: "Voice Cap",
        interpolation: {
            title: "Interpolation Method",
            nearestNeighbor: "Nearest Neighbor",
            linear: "Linear",
            cubic: "Cubic",
            sinc32: "Sinc (32 point)",
            sinc128: "Sinc (128 point, very slow)"
        },
        reverbLevel: "Reverb Level",
        chorusLevel: "Chorus Level",
        delayLevel: "Delay Level",
        velocitySenseDepth: "Velocity Sense Depth",
        velocitySenseOffset: "Velocity Sense Offset"
    },

    sampleImport: {
        title: "Sample Import",
        removeSilence:
            "Remove silence at the start of imported and replaced audio",
        trimAfterLoop: "Trim imported and replaced audio after its loop"
    },

    midi: {
        title: "MIDI Settings",
        waitingForAccess: "Waiting for MIDI Access…",
        midiInput: "MIDI Input",
        noInput: "No Input",
        notSupported: "Your browser does not support WebMIDI.",
        accessError: "MIDI access error."
    }
};
