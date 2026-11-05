export const MenuBarLocale = {
    file: {
        file: "Plik",
        new: "Nowy",
        open: "Otwórz",
        close: "Zamknij",
        save: "Zapisz",
        saveSF2: "Zapisz SF2",
        saveDLS: "Zapisz DLS",
        saveSF3: "Zapisz SF3",
        saveSFE: "Zapisz SFE",
        warnSF2:
            "Ten bank dźwięków zawiera skompresowane próbki. " +
            "Zapisanie go w formacie SF2 bezpowrotnie pogorszy ich jakość. Czy na pewno chcesz kontynuować?",
        warnText:
            "Niektóre nazwy lub informacje o banku zawierają znaki spoza Latin-1 (np. ą, ż lub 日). " +
            "Pliki banków dźwięków nie mogą ich przechować, więc zostaną zapisane błędnie. Czy na pewno chcesz kontynuować?",
        warnSFEData:
            "Ten bank dźwięków używa generatorów lub modulatorów SpessaSynth, które zapisują tylko pliki SFE. " +
            "Zapis w formacie {{format}} je pominie. Czy na pewno chcesz kontynuować?",
        warnBankNumbers:
            "Niektóre zestawy perkusyjne ustawiają bank MSB lub LSB, albo niektóre presety ustawiają oba. " +
            "Pliki {{format}} nie mogą ich przechować, więc te presety zostaną zapisane z innymi numerami banku. Czy na pewno chcesz kontynuować?",
        warnDLS:
            "Ten bank dźwięków zawiera {{losses}}, których pliki DLS nie mogą przechować. " +
            "Zapis w formacie DLS je pominie. Czy na pewno chcesz kontynuować?",
        warnSubject:
            "Ten bank dźwięków ma temat, na który pliki {{format}} nie mają miejsca. " +
            "Zapis w formacie {{format}} doda temat na końcu opisu. Czy na pewno chcesz kontynuować?",
        warnDefaultModulators:
            "Ten bank dźwięków ma zmienione domyślne modulatory. Używają ich tylko odtwarzacze oparte na SpessaSynth, " +
            "inne odtwarzają go ze standardowymi. Czy na pewno chcesz kontynuować?",
        dlsLossStereoLinks: "połączone próbki stereo",
        dlsLossUnusedInstruments: "instrumenty nieużywane przez żaden preset",
        dlsLossDefaultModulators: "zmienione domyślne modulatory",
        warn24Bit:
            "Plik tego banku dźwięków zawiera 24-bitowe próbki. SpessaFont zachowuje z nich 16 bitów, " +
            "więc zapisany plik straci resztę. Czy na pewno chcesz kontynuować?",
        fullscreen: "Pełny ekran",
        about: "O programie"
    },
    edit: {
        edit: "Edytuj",
        undo: "Cofnij",
        undoWhat: "Cofnij: {{what}}",
        redoWhat: "Ponów: {{what}}",
        undone: "Cofnięto: {{what}}",
        redone: "Ponowiono: {{what}}",
        nothingToUndo: "Nie ma czego cofnąć.",
        redo: "Ponów",
        nothingToRedo: "Nie ma czego ponowić.",
        removeUnusedElements: "Usuń nieużywane elementy",
        autoLinkSamples: "Automatycznie połącz próbki stereo",
        mergeDuplicateSamples: "Scal powtarzające się próbki"
    },
    tools: {
        preset: "Narzędzia presetu",
        instrument: "Narzędzia instrumentu",
        sample: "Narzędzia próbki"
    },
    history: {
        addInstrument: "Dodanie instrumentu",
        addPreset: "Dodanie presetu",
        addSample: "Dodanie próbki",
        addZone: "Dodanie strefy",
        changeAudio: "Zmiana dźwięku",
        changePatch: "Zmiana patcha",
        changeSampleType: "Zmiana typu próbki",
        convertSamples: "Konwersja próbek",
        deleteInstrument: "Usunięcie instrumentu",
        deletePreset: "Usunięcie presetu",
        deleteSample: "Usunięcie próbki",
        deleteZone: "Usunięcie strefy",
        editBankInfo: "Edycja informacji o banku",
        editDefaultModulators: "Edycja domyślnych modulatorów",
        editGenerator: "Edycja generatora",
        editModulators: "Edycja modulatorów",
        editRange: "Edycja zakresu",
        editSample: "Edycja próbki",
        renameInstrument: "Zmiana nazwy instrumentu",
        renamePreset: "Zmiana nazwy presetu",
        renameSample: "Zmiana nazwy próbki",
        replaceZoneChild: "Zamiana elementu strefy",
        splitZones: "Podział stref"
    },
    midi: {
        player: "Odtwarzacz MIDI",
        play: "Odtwórz MIDI",
        pause: "Wstrzymaj",
        resume: "Wznów",
        loadError: "Nie udało się wczytać {{name}}.",
        noName: "Bez nazwy",
        rewind: "Cofnij odrobinę"
    },

    voices: "Głosy:"
};
