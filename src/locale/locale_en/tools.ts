export const ToolsLocale = {
    nothingChanged: "Nothing was changed.",
    noZones: "The selection has no zones.",

    cells: {
        clear: "Clear",
        otherGenerator:
            "The copied cells are of another generator, paste them into the same row."
    },

    keyCurve: {
        menu: "Key Curve…",
        title: "Set a generator along the keyboard",
        graph: "The curve over the keys",
        generator: "Generator",
        operation: "Operation",
        replace: "Replace",
        add: "Add",
        multiply: "Multiply",
        pattern: "Pattern",
        linearUp: "Linear, rising",
        linearDown: "Linear, falling",
        exponentialUp: "Exponential, rising",
        exponentialDown: "Exponential, falling",
        random: "Random",
        drawn: "Drawn",
        minimum: "Minimum",
        maximum: "Maximum",
        shownUnits: "Minimum and maximum are in the units the table shows.",
        factor: "Minimum and maximum are factors the values are multiplied by.",
        fromKey: "From key",
        toKey: "To key",
        steepness: "Steepness",
        spread: "Gathering to the middle",
        reroll: "Reroll",
        velocityFilter: "Only zones in a velocity range",
        velocityMin: "Lowest velocity",
        velocityMax: "Highest velocity",
        clickHint:
            "Click the graph to move the nearer end of the curve, right click to move its end.",
        drawHint: "Draw the curve on the graph.",
        randomHint: "Each key gets the value shown, reroll for others.",
        noZones: "No zone is in the velocity range."
    },

    attenuation: {
        menu: "Change Attenuations…",
        title: "Change the attenuation of the selection",
        current: "The zones play from {{lowest}} dB to {{highest}} dB.",
        mode: "Change",
        setLowest: "Set the lowest to",
        add: "Add",
        lowest: "Lowest attenuation (dB)",
        offset: "Offset (dB)",
        preview:
            "Offset {{offset}} dB, the zones then play from {{lowest}} dB to {{highest}} dB.",
        reduced:
            "The offset was made smaller, so that no zone goes past the attenuation range."
    },

    naturalRelease: {
        menu: "Natural Release…",
        title: "Give the zones a release that shortens with pitch",
        seconds: "Release at key {{key}} (s)",
        factor: "Factor per octave",
        detune: "Detune during the release (cents)",
        explanation:
            "Each zone gets the release for the middle of its key range. A factor below 1 makes higher keys release faster.",
        overwriteWarning_one:
            "The detune replaces the modulation envelope of {{count}} zone.",
        overwriteWarning_other:
            "The detune replaces the modulation envelope of {{count}} zones.",
        clamped: "Releases kept inside the release range: {{count}}",
        overwritten: "Zones whose modulation envelope was replaced: {{count}}"
    },

    split: {
        menu: "Split Zones…",
        byKeyMenu: "Split by Key",
        byVelocityMenu: "Split by Velocity…",
        title: "Split zones",
        mode: "Split",
        byKey: "By key",
        byVelocity: "By velocity",
        step: "Width of each new zone",
        velocityHint:
            "One zone per velocity makes up to 128 zones out of each zone, a larger width is usually enough.",
        nothingToSplit: "There is nothing to split.",
        skipped: "Skipped elements with nothing to split: {{count}}",
        confirmMany:
            "Splitting makes {{count}} zones in one element. Split anyway?"
    },

    shift: {
        menu: "Shift a Property…",
        title: "Shift a property of the selected samples",
        property: "Property",
        originalKey: "Original key",
        pitchCorrection: "Pitch correction",
        loopStart: "Loop start",
        loopEnd: "Loop end",
        operation: "Operation",
        add: "Add",
        multiply: "Multiply",
        value: "Value",
        done: "Samples changed: {{count}}, values kept in range: {{clamped}}"
    },

    trim: {
        removeSilence: "Remove Silence at Start",
        trimAfterLoop: "Trim After Loop",
        trimAfterLoopTitle:
            "Removes the audio after the loop end, keeping a few frames for interpolation",
        noSilence: "There is no silence at the start.",
        skippedSilent: "Skipped silent samples: {{count}}",
        skippedNoLoop:
            "Skipped samples without a loop or with nothing after it: {{count}}",
        losesTail_one:
            "{{count}} trimmed sample is played past its loop by a zone and lost the end of its sound. Undo if that was not wanted.",
        losesTail_other:
            "{{count}} trimmed samples are played past their loop by a zone and lost the end of their sound. Undo if that was not wanted."
    },

    merge: {
        menuSelection: "Merge Duplicates",
        searching: "Looking for duplicate samples...",
        none: "No duplicate samples found.",
        merged: "Merged duplicate samples: {{count}}"
    }
};
