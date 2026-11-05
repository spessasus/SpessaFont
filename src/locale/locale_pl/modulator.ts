export const ModulatorLocale = {
    modulatorNumber: "Modulator #{{number}}",
    deleteModulator: "Usuń modulator #{{number}}",
    primarySource: "Źródło główne",
    secondarySource: "Źródło dodatkowe",
    primaryCurve: "Krzywa źródła głównego",
    secondaryCurve: "Krzywa źródła dodatkowego",
    transform: "Przekształcenie",
    destination: "Cel",
    curves: {
        linear: "Liniowa",
        concave: "Wklęsła",
        convex: "Wypukła",
        switch: "Skokowa",
        unipolar: "jednobiegunowa",
        bipolar: "dwubiegunowa",
        positive: "dodatnia",
        negative: "ujemna",
        label: "{{shape}}, {{polarity}}, {{direction}}"
    },
    editModulators: "Edytuj modulatory dla {{name}}",
    closeEditor: "Zamknij edytor modulatorów",
    modulators: "Modulatory", // plural
    modulatorCount: "Modulatory: {{count}}",
    newModulator: "Nowy",
    editingModulators: "Edytowanie modulatorów dla {{name}}",
    overriding: "Nadpisywanie domyślnego modulatora",
    sources: {
        noController: "Brak kontrolera = 1",
        velocity: "Siła nacisku",
        midiNote: "Numer nuty MIDI",
        polyPressure: "Aftertouch polifoniczny",
        channelPressure: "Aftertouch kanału",
        pitchWheel: "Koło wysokości dźwięku",
        pitchWheelRange: "Zakres koła wysokości dźwięku",
        link: "Połączony modulator (nieobsługiwany)",
        otherSource: "Źródło {{number}}",
        otherController: "CC#{{number}}"
    },
    otherDestination: "Generator {{number}}",
    linkDestination: "Połączony lub nieprawidłowy (nieobsługiwany)",
    transforms: {
        noOperation: "Brak operacji",
        absoluteValue: "Wartość bezwzględna"
    },
    amount: "Mnożnik"
};
