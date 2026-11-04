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
    defaultModulatorsFor: "Domyślne modulatory dla",
    defaultModulators: "Domyślne modulatory:",
    checkButton: "Sprawdzenie banku:",
    check: {
        title: "Sprawdzenie banku: znaleziono {{count}}",
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
        longName: "Dłuższa niż {{length}} znaków, tyle zachowują SF2 i SF3:",
        nonLatin1Name: "Ma znaki, których zapisane pliki nie zachowają:"
    }
};
