export const SettingsLocale = {
    settings: "Ustawienia",
    closeSettings: "Zamknij ustawienia",
    interface: {
        title: "Ustawienia interfejsu",
        language: "Język",
        browserLanguage: "Język przeglądarki ({{name}})",
        theme: "Motyw",
        dark: "Ciemny",
        light: "Jasny"
    },
    audioEngine: {
        title: "Ustawienia silnika audio",
        sampleRate: "Częstotliwość próbkowania",
        sampleRateRejected:
            "Ta przeglądarka nie obsługuje częstotliwości {{rate}} Hz, więc używana jest częstotliwość {{fallback}} Hz.",
        sampleRateReload:
            "Zmiana częstotliwości próbkowania przeładuje stronę i zamknie wszystkie otwarte banki.",
        sampleRateUnsaved_one:
            "Niezapisane zmiany w {{count}} banku zostaną utracone.",
        sampleRateUnsaved_few:
            "Niezapisane zmiany w {{count}} bankach zostaną utracone.",
        sampleRateUnsaved_many:
            "Niezapisane zmiany w {{count}} bankach zostaną utracone.",
        sampleRateUnsaved_other:
            "Niezapisane zmiany w {{count}} banku zostaną utracone.",
        reloadWithRate: "Przeładuj z {{rate}} Hz",
        keepRate: "Zostaw {{rate}} Hz",
        workerFailed:
            "Syntezator nie mógł uruchomić się w tle, więc działa na stronie. W chwilach obciążenia dźwięk może się przerywać.",
        hostFailed:
            "Błąd syntezatora: {{message}}. To, co słychać i co zostanie zapisane, może się różnić od tego, co widać, więc zapisz kopię i odśwież stronę.",
        volume: "Głośność",
        voiceCap: "Limit głosów",
        interpolation: {
            title: "Metoda interpolacji",
            nearestNeighbor: "Najbliższy sąsiad",
            linear: "Liniowa",
            cubic: "Sześcienna",
            sinc32: "Sinc (32 punkty)",
            sinc128: "Sinc (128 punktów, bardzo wolna)"
        },
        reverbLevel: "Poziom pogłosu",
        chorusLevel: "Poziom chóru",
        delayLevel: "Poziom opóźnienia",
        velocitySenseDepth: "Głębokość czułości na siłę nacisku",
        velocitySenseOffset: "Przesunięcie czułości na siłę nacisku"
    },

    sampleImport: {
        title: "Import próbek",
        removeSilence:
            "Usuń ciszę na początku importowanego i zastąpionego dźwięku",
        trimAfterLoop: "Przytnij importowany i zastąpiony dźwięk po jego pętli"
    },

    midi: {
        title: "Ustawienia MIDI",
        waitingForAccess: "Oczekiwanie na dostęp MIDI…",
        midiInput: "Wejście MIDI",
        noInput: "Brak wejścia",
        notSupported: "Twoja przeglądarka nie obsługuje WebMIDI.",
        accessError: "Błąd dostępu do MIDI."
    }
};
