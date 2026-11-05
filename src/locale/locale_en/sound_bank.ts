export const SoundBankLocale = {
    deleteZone: "Delete zone {{name}}",
    cellLabel: "{{generator}}, {{zone}}",
    globalZone: "Global Zone",
    pickZoneSample: "Add a zone with which sample?",
    pickZoneInstrument: "Add a zone with which instrument?",
    createNewZone: "Create New Zone",
    thisIsAStereoSamplePair: "This is a stereo sample pair.",

    modifiedSamples_one: "Modified {{count}} sample.",
    modifiedSamples_other: "Modified {{count}} samples.",
    nothingToRemove:
        "Every instrument and sample is in use, nothing was removed.",
    removedElements:
        "Removed unused elements. Instruments: {{instruments}}, samples: {{samples}}",

    loopingModes: {
        noLoop: "No Loop",
        loop: "Loop",
        loopUntilRelease: "Until Release",
        startOnRelease: "On Release"
    },
    switchStates: {
        off: "Off",
        on: "On"
    },
    lfoWaveforms: {
        triangle: "Triangle",
        sawtooth: "Sawtooth",
        sine: "Sine"
    },
    units: {
        // keep the suffixes short
        cent: {
            suf: "cent",
            full: "Musical Cents"
        },
        acent: {
            suf: "acent",
            full: "Absolute Cents"
        },
        tcent: {
            suf: "tcent",
            full: "Timecents"
        },
        centPerKey: {
            suf: "cent/key",
            full: "Cents Per Key Number"
        },
        tcentPerKey: {
            suf: "tcent/key",
            full: "Timecents Per Key Number"
        },
        sec: {
            suf: "sec",
            full: "Seconds"
        },

        dB: {
            suf: "dB",
            full: "Decibels"
        },

        Hz: {
            suf: "Hz",
            full: "Hertz"
        },

        percent: {
            suf: "%",
            full: "Percentage"
        },

        pan: {
            suf: "[-500; 500]",
            full: "-500 = Hard Left; 0 = Center; 500 = Hard Right"
        },

        presetPan: {
            suf: "[-1000; 1000]",
            full: "Added to the instrument's pan. -1000 = Hard Left; 0 = No Change; 1000 = Hard Right"
        },

        degree: {
            suf: "°",
            full: "Degrees of a cycle"
        }
    }
};
