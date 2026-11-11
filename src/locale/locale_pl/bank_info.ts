export const BankInfoLocale = {
    name: "Nazwa banku",
    engineer: "Inżynier",
    creationDate: "Data utworzenia",
    product: "Produkt",
    copyright: "Prawa autorskie",
    subject: "Temat",
    description: "Opis",

    stats: "Informacje:",
    version: "Wersja:",
    software: "Oprogramowanie:",
    engine: "Silnik dźwięku:",

    samples: "Próbki:",
    instruments: "Instrumenty:",
    presets: "Presety:",
    unnamed: "Bez nazwy",

    compressed: "Skompresowane:",
    count: "Liczba:",
    generatorCount: "Liczba generatorów:",
    modulatorCount: "Liczba modulatorów:",
    defaultModulatorsForBank: "Domyślne modulatory dla <bank>{{name}}</bank>:",
    defaultModulators: "Domyślne modulatory:",
    resetDefaultModulators: "Przywróć domyślne",
    format: {
        label: "Format",
        sf2: "SoundFont 2",
        sfe: "SFE",
        hideSFEData:
            "Ten bank używa generatorów lub modulatorów SFE. Tryb SoundFont 2 ukrywa je, ale zapis jako cokolwiek innego niż SFE bezpowrotnie je usuwa!",
        switchToSF2: "Przełącz na SoundFont 2",
        switchedOnPaste:
            "Dodane elementy używają danych SFE, więc bank jest teraz w trybie SFE.",
        switchedOnSave: "Zapisano jako SFE, więc bank jest teraz w trybie SFE."
    },
    checkButton: "Problemy:",
    check: {
        title: "Problemy: {{count}}",
        noIssues: "Nic nie znaleziono. Bank wygląda dobrze.",
        duplicatePatch:
            "Te presety mają ten sam patch {{patch}}, więc gra tylko jeden:",
        duplicateZone: "Gra {{zone}} dwa razy tak samo:",
        emptyElement: "Nie ma stref i nic nie gra:",
        unusedInstrument: "Nie jest używany przez żaden preset:",
        unusedSample: "Nie jest używana przez żaden instrument:",
        loopOutside: "Pętla wychodzi poza koniec próbki:",
        fixLoop: "Popraw pętlę",
        stereoOneSided:
            "Połączona z próbką, która nie jest połączona z powrotem:",
        stereoRate: "Para stereo o różnych częstotliwościach próbkowania:",
        stereoLength: "Para stereo o różnych długościach:",
        longName:
            "Dłuższa niż {{length}} znaków. Odtwarzacze inne niż SpessaSynth pokazują w plikach SF2 i SF3 tylko pierwsze {{length}}:",
        cutName:
            "Dłuższa niż {{length}} znaków, zapis SF2, SF3 i SFE ją skraca (DLS zachowuje całą nazwę):",
        nonLatin1Name: "Ma znaki, których zapisane pliki nie zachowają:",
        nonLatin1Info:
            "Informacje o banku mają znaki, których zapisane pliki nie zachowają.",
        bankNumberLost: "Ma numery banku, które zapis SF2 lub SF3 zmieni:",
        sfeOnlyData:
            "Używa generatorów lub modulatorów SpessaSynth, które zachowuje tylko zapis SFE:",
        sfeDefaultModulators:
            "Domyślne modulatory sterują generatorami SpessaSynth, które zachowuje tylko zapis SFE.",
        linkedModulator:
            "Ma połączone modulatory, których SpessaSynth nie odtwarza, a zapis je psuje:",
        showAll: "Pokaż wszystkie ({{count}})"
    }
};
