export const SampleLocale = {
    sampleName: "Nazwa próbki",
    sampleRate: "Częstotliwość próbkowania (Hz)",
    loopStart: "Początek pętli",
    loopEnd: "Koniec pętli",
    originalKey: "Oryginalny klawisz",
    centCorrection: "Korekta centów",
    type: "Typ",
    link: "Połączenie",
    unlinked: "Niepołączona",
    pickPartner: "Wybierz drugą połowę pary stereo",
    waveZoomPercent: "Powiększenie fali: {{percent}}%",
    audioReadFailed: "Nie udało się odczytać dźwięku próbki: {{message}}",
    lengthFrames: "Długość: {{frames}}",
    loopFrames: "Pętla: {{frames}}",
    seconds: "{{seconds}} s",
    milliseconds: "{{milliseconds}} ms",
    types: {
        invalid: "Nieprawidłowy",
        mono: "Mono",
        left: "Lewy",
        right: "Prawy",
        linked: "Połączony",
        romMono: "ROM Mono",
        romLeft: "ROM Lewy",
        romRight: "ROM Prawy",
        romLinked: "ROM Połączony"
    },

    tools: {
        play: "Odtwórz",
        playLooped: "Odtwórz w pętli",
        stop: "Zatrzymaj",
        wavExport: "Eksport WAV",
        wavExportLoop: "Eksport WAV (pętla)",
        replaceAudio: "Zastąp audio",
        normalize: "Normalizuj",
        autoLoop: "Auto pętla",
        autoLoopTitle:
            "Znajdź punkty pętli w podtrzymaniu i wygładź przejście, aby pętla grała bez trzasku",
        tooShortToLoop: "Próbka jest zbyt krótka na pętlę.",
        nothingToNormalize:
            "Próbka zawiera samą ciszę, nie ma czego normalizować.",
        failed: "Nie udało się przetworzyć dźwięku próbki.",
        loading: "Ładowanie…",
        invalidAudioFile: "Nieprawidłowy plik audio",
        tooManyChannels: "Zbyt wiele kanałów"
    },

    equalizer: {
        title: "Korektor",
        band: "Pasmo {{frequency}} Hz (dB)",
        gain: "Wzmocnienie",
        gainDb: "Wzmocnienie (dB)",
        preview: "Podgląd",
        reset: "Resetuj",
        apply: "Zastosuj",
        clipping:
            "Wynik przekracza pełną skalę i zostanie przycięty przy zapisie. Znormalizuj go lub zmniejsz wzmocnienie."
    },

    importedSamples_one: "Zaimportowano {{count}} plik jako próbkę.",
    importedSamples_few: "Zaimportowano {{count}} pliki jako próbki.",
    importedSamples_many: "Zaimportowano {{count}} plików jako próbki.",
    importedSamples_other: "Zaimportowano {{count}} pliku jako próbki.",
    makeInstrument: "Utwórz z nich instrument",
    notNow: "Nie teraz",
    importedSamplesGone: "Zaimportowanych próbek nie ma już w banku.",
    importingSamples: "Importowanie plików audio ({{done}} z {{total}})…",
    importFailed_one: "Nie udało się zaimportować {{count}} pliku: {{names}}",
    importFailed_few: "Nie udało się zaimportować {{count}} plików: {{names}}",
    importFailed_many: "Nie udało się zaimportować {{count}} plików: {{names}}",
    importFailed_other: "Nie udało się zaimportować {{count}} pliku: {{names}}",
    newInstrumentFromSample: "Nowy instrument z tej próbki",
    notLinkedToInstrument: "Jeszcze nieużyta.",
    usedBy: "Używana przez:",
    compressedSample: "Skompresowana próbka",
    deleteSample: "Usuń próbkę"
};
