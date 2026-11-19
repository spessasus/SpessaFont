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
        sfe: "SFe",
        hideSFeData:
            "Ten bank używa generatorów lub modulatorów SFe. Tryb SoundFont 2 ukrywa je, ale zapis jako cokolwiek innego niż SFe bezpowrotnie je usuwa!",
        switchToSF2: "Przełącz na SoundFont 2",
        switchedOnPaste:
            "Dodane elementy używają danych SFe, więc bank jest teraz w trybie SFe.",
        switchedOnSave: "Zapisano jako SFe, więc bank jest teraz w trybie SFe."
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
            "Dłuższa niż {{length}} znaków, zapis SF2, SF3 i SFe ją skraca (DLS zachowuje całą nazwę):",
        nonLatin1Name: "Ma znaki, których zapisane pliki nie zachowają:",
        nonLatin1Info:
            "Informacje o banku mają znaki, których zapisane pliki nie zachowają.",
        bankNumberLost: "Ma numery banku, które zapis SF2 lub SF3 zmieni:",
        sfeOnlyData:
            "Używa generatorów, modulatorów lub pętli SFe, które zachowuje tylko zapis SFe:",
        sfeDefaultModulators:
            "Niektóre domyślne modulatory używają generatorów lub krzywych SFe, które zachowuje tylko zapis SFe.",
        linkedModulator:
            "Ma połączone modulatory, których SpessaSynth nie odtwarza, a zapis je psuje:",
        showAll: "Pokaż wszystkie ({{count}})"
    }
};
