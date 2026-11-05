export const SoundBankLocale = {
    deleteZone: "Usuń strefę {{name}}",
    cellLabel: "{{generator}}, {{zone}}",
    globalZone: "Strefa globalna",
    pickZoneSample: "Dodać strefę z którą próbką?",
    pickZoneInstrument: "Dodać strefę z którym instrumentem?",
    createNewZone: "Utwórz nową strefę",
    thisIsAStereoSamplePair: "To jest para próbek stereo.",

    modifiedSamples_one: "Zmodyfikowano {{count}} próbkę.",
    modifiedSamples_few: "Zmodyfikowano {{count}} próbki.",
    modifiedSamples_many: "Zmodyfikowano {{count}} próbek.",
    modifiedSamples_other: "Zmodyfikowano {{count}} próbki.",
    noSamplesWereChanged: "Nie zmieniono żadnych próbek.",
    nothingToRemove:
        "Wszystkie instrumenty i próbki są używane, nic nie usunięto.",
    removedElements:
        "Usunięto nieużywane elementy. Instrumenty: {{instruments}}, próbki: {{samples}}",

    loopingModes: {
        noLoop: "Brak pętli",
        loop: "Pętla",
        loopUntilRelease: "Do puszczenia klawisza",
        startOnRelease: "Przy puszczeniu klawisza"
    },
    switchStates: {
        off: "Wyłączone",
        on: "Włączone"
    },
    lfoWaveforms: {
        triangle: "Trójkąt",
        sawtooth: "Piła",
        sine: "Sinus"
    },
    units: {
        // keep the suffixes short
        cent: {
            suf: "cent",
            full: "Centy muzyczne"
        },
        acent: {
            suf: "acent",
            full: "Centy bezwzględne"
        },
        tcent: {
            suf: "tcent",
            full: "Centy czasowe"
        },
        centPerKey: {
            suf: "cent/klawisz",
            full: "Centy na numer klawisza"
        },
        sec: {
            suf: "sek",
            full: "Sekundy"
        },

        dB: {
            suf: "dB",
            full: "Decybele"
        },

        Hz: {
            suf: "Hz",
            full: "Herc"
        },

        percent: {
            suf: "%",
            full: "Procent"
        },

        pan: {
            suf: "[-500; 500]",
            full: "-500 = Twardo w lewo; 0 = Środek; 500 = Twardo w prawo"
        },

        degree: {
            suf: "°",
            full: "Stopnie cyklu"
        }
    }
};
