export const ToolsLocale = {
    nothingChanged: "Nic nie zostało zmienione.",
    noZones: "Zaznaczenie nie ma stref.",

    cells: {
        clear: "Wyczyść",
        otherTable:
            "Komórek skopiowanych z instrumentu nie można wkleić do presetu ani odwrotnie, bo wartości presetu dodają się do wartości jego instrumentów.",
        invalidText:
            "„{{text}}” nie jest wartością, którą ta komórka może przyjąć.",
        stereoValues: "{{first}}: {{firstValue}}, {{second}}: {{secondValue}}"
    },

    keyCurve: {
        menu: "Krzywa klawiszy…",
        title: "Ustaw generator wzdłuż klawiatury",
        graph: "Krzywa na klawiszach",
        generator: "Generator",
        operation: "Działanie",
        replace: "Zastąp",
        add: "Dodaj",
        multiply: "Pomnóż",
        pattern: "Kształt",
        linearUp: "Liniowy, rosnący",
        linearDown: "Liniowy, malejący",
        exponentialUp: "Wykładniczy, rosnący",
        exponentialDown: "Wykładniczy, malejący",
        random: "Losowy",
        drawn: "Rysowany",
        minimum: "Minimum",
        maximum: "Maksimum",
        shownUnits: "Minimum i maksimum są w jednostkach pokazanych w tabeli.",
        factor: "Minimum i maksimum to mnożniki wartości.",
        fromKey: "Od klawisza",
        toKey: "Do klawisza",
        steepness: "Stromość",
        spread: "Skupienie wokół środka",
        reroll: "Losuj ponownie",
        velocityFilter: "Tylko strefy w zakresie siły nacisku",
        velocityMin: "Najmniejsza siła nacisku",
        velocityMax: "Największa siła nacisku",
        clickHint:
            "Kliknij wykres, aby przesunąć bliższy koniec krzywej, prawy przycisk przesuwa koniec „Do klawisza”.",
        drawHint: "Narysuj krzywą na wykresie.",
        randomHint:
            "Każdy klawisz dostaje pokazaną wartość, losuj ponownie, aby dostać inne.",
        flat: "Minimum i maksimum są równe, więc każda strefa dostanie tę wartość.",
        noZones: "Żadna strefa nie jest w zakresie siły nacisku."
    },

    attenuation: {
        menu: "Zmień wyciszenie…",
        title: "Zmień wyciszenie zaznaczenia",
        current: "Strefy grają od {{lowest}} dB do {{highest}} dB.",
        mode: "Zmiana",
        setLowest: "Ustaw najmniejsze na",
        add: "Dodaj",
        lowest: "Najmniejsze wyciszenie (dB)",
        offset: "Przesunięcie (dB)",
        preview:
            "Przesunięcie {{offset}} dB, strefy będą grać od {{lowest}} dB do {{highest}} dB.",
        reduced:
            "Przesunięcie zostało zmniejszone, aby żadna strefa nie wyszła poza zakres wyciszenia."
    },

    naturalRelease: {
        menu: "Naturalne wybrzmienie…",
        title: "Nadaj strefom wybrzmienie, które skraca się z wysokością",
        seconds: "Wybrzmienie na klawiszu {{key}} (s)",
        factor: "Mnożnik na oktawę",
        detune: "Odstrojenie podczas wybrzmienia (centy)",
        explanation:
            "Każda strefa dostaje wybrzmienie dla środka swojego zakresu klawiszy. Mnożnik poniżej 1 sprawia, że wyższe klawisze wybrzmiewają szybciej.",
        overwriteWarning_one:
            "Odstrojenie zastępuje obwiednię modulacji w {{count}} strefie.",
        overwriteWarning_few:
            "Odstrojenie zastępuje obwiednię modulacji w {{count}} strefach.",
        overwriteWarning_many:
            "Odstrojenie zastępuje obwiednię modulacji w {{count}} strefach.",
        overwriteWarning_other:
            "Odstrojenie zastępuje obwiednię modulacji w {{count}} strefy.",
        clamped: "Wybrzmienia utrzymane w zakresie: {{count}}",
        overwritten: "Strefy z zastąpioną obwiednią modulacji: {{count}}"
    },

    split: {
        menu: "Podziel strefy…",
        byKeyMenu: "Podziel według klawiszy",
        byVelocityMenu: "Podziel według siły nacisku…",
        title: "Podziel strefy",
        mode: "Podział",
        byKey: "Według klawiszy",
        byVelocity: "Według siły nacisku",
        step: "Szerokość każdej nowej strefy",
        velocityHint:
            "Jedna strefa na każdą siłę nacisku robi do 128 stref z każdej strefy, zwykle wystarcza większa szerokość.",
        nothingToSplit: "Nie ma czego dzielić.",
        skipped: "Pominięte elementy bez stref do podziału: {{count}}",
        confirmMany_one:
            "Podział utworzy {{count}} strefę w jednym elemencie. Podzielić mimo to?",
        confirmMany_few:
            "Podział utworzy {{count}} strefy w jednym elemencie. Podzielić mimo to?",
        confirmMany_many:
            "Podział utworzy {{count}} stref w jednym elemencie. Podzielić mimo to?",
        confirmMany_other:
            "Podział utworzy {{count}} strefy w jednym elemencie. Podzielić mimo to?"
    },

    shift: {
        menu: "Przesuń właściwość…",
        title: "Przesuń właściwość zaznaczonych próbek",
        property: "Właściwość",
        originalKey: "Oryginalny klawisz",
        pitchCorrection: "Korekta centów",
        loopStart: "Początek pętli",
        loopEnd: "Koniec pętli",
        operation: "Działanie",
        add: "Dodaj",
        multiply: "Pomnóż",
        value: "Wartość",
        done: "Zmienione próbki: {{count}}, wartości utrzymane w zakresie: {{clamped}}"
    },

    trim: {
        removeSilence: "Usuń ciszę na początku",
        trimAfterLoop: "Przytnij po pętli",
        trimAfterLoopTitle:
            "Usuwa dźwięk po końcu pętli, zostawiając kilka ramek do interpolacji",
        noSilence: "Na początku nie ma ciszy.",
        loopAtStart:
            "Pętla zaczyna się na samym początku próbki, więc ciszy przed dźwiękiem nie można usunąć.",
        skippedSilent: "Pominięte ciche próbki: {{count}}",
        skippedNoLoop:
            "Pominięte próbki bez pętli lub bez niczego po niej: {{count}}",
        losesTail_one:
            "{{count}} przycięta próbka jest grana przez strefę za pętlą i straciła koniec dźwięku. Cofnij, jeśli nie było to zamierzone.",
        losesTail_few:
            "{{count}} przycięte próbki są grane przez strefę za pętlą i straciły koniec dźwięku. Cofnij, jeśli nie było to zamierzone.",
        losesTail_many:
            "{{count}} przyciętych próbek jest granych przez strefę za pętlą i straciło koniec dźwięku. Cofnij, jeśli nie było to zamierzone.",
        losesTail_other:
            "{{count}} przyciętej próbki jest grane przez strefę za pętlą i straciło koniec dźwięku. Cofnij, jeśli nie było to zamierzone."
    },

    merge: {
        menuSelection: "Scal duplikaty",
        searching: "Szukanie powtarzających się próbek…",
        none: "Nie znaleziono powtarzających się próbek.",
        merged: "Scalone powtarzające się próbki: {{count}}"
    }
};
