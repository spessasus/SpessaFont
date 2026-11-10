import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LOCALE, getUserLocale } from "./get_user_locale.ts";
import { loadSettings, parseSettings } from "./load.ts";
import {
    DEFAULT_SETTINGS,
    SPESSAFONT_SETTINGS_KEY
} from "./settings_typedef.ts";

const SUPPORTED = ["en", "pl", "zh"];

function stubLanguages(languages: string[]) {
    vi.stubGlobal("navigator", { languages, language: languages[0] });
}

describe("getUserLocale", () => {
    it("picks the first preferred language that is supported", () => {
        stubLanguages(["de-DE", "pl-PL", "en-US"]);
        expect(getUserLocale(SUPPORTED)).toBe("pl");
    });

    it("ignores region and case", () => {
        stubLanguages(["ZH-tw"]);
        expect(getUserLocale(SUPPORTED)).toBe("zh");
    });

    it("falls back to the default locale when nothing matches", () => {
        stubLanguages(["de-DE"]);
        expect(getUserLocale(SUPPORTED)).toBe(DEFAULT_LOCALE);
    });
});

describe("loadSettings", () => {
    afterEach(() => {
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
    });

    it("returns the defaults when nothing is saved", () => {
        expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it("returns the saved settings", () => {
        const saved = { ...DEFAULT_SETTINGS, volume: 0.5, theme: "light" };
        localStorage.setItem(SPESSAFONT_SETTINGS_KEY, JSON.stringify(saved));

        expect(loadSettings()).toEqual(saved);
    });

    it("fills in keys missing from older saves", () => {
        localStorage.setItem(
            SPESSAFONT_SETTINGS_KEY,
            JSON.stringify({ volume: 0.5 })
        );

        expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, volume: 0.5 });
    });

    it("falls back to the defaults when the saved data is corrupt", () => {
        localStorage.setItem(SPESSAFONT_SETTINGS_KEY, "{not json");

        expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
});

/**
 * The page as a sample rate change reloads it, with the address it ends up showing.
 */
function openPage(search: string) {
    const page = { url: new URL(`http://localhost:5173/${search}`) };
    vi.stubGlobal("location", page.url);
    vi.stubGlobal("history", {
        state: null,
        replaceState: (_state: unknown, _title: string, url: URL) => {
            page.url = url;
        }
    });
    return page;
}

describe("loadSettings with a sample rate in the address", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
    });

    it("uses and saves the rate a reload asked for, over the saved one", () => {
        localStorage.setItem(
            SPESSAFONT_SETTINGS_KEY,
            JSON.stringify({ ...DEFAULT_SETTINGS, sampleRate: 44_100 })
        );
        const page = openPage("?samplerate=96000&other=1");

        expect(loadSettings().sampleRate).toBe(96_000);
        vi.unstubAllGlobals();
        expect(loadSettings().sampleRate).toBe(96_000);
        // Taken out, so a later reload or a copied link does not apply it again
        expect(page.url.search).toBe("?other=1");
    });

    it("ignores a rate out of range", () => {
        openPage("?samplerate=5");

        expect(loadSettings().sampleRate).toBe(DEFAULT_SETTINGS.sampleRate);
    });

    it("keeps the saved rate when the address has none", () => {
        localStorage.setItem(
            SPESSAFONT_SETTINGS_KEY,
            JSON.stringify({ ...DEFAULT_SETTINGS, sampleRate: 44_100 })
        );
        openPage("");

        expect(loadSettings().sampleRate).toBe(44_100);
    });
});

describe("parseSettings", () => {
    it("returns the defaults for data that is not an object", () => {
        for (const data of [null, 5, "text", [1, 2]]) {
            expect(parseSettings(data)).toEqual(DEFAULT_SETTINGS);
        }
    });

    it("reads the on and off settings and drops values that are not booleans", () => {
        expect(
            parseSettings({ removeImportSilence: true, trimImportAfterLoop: 1 })
        ).toEqual({ ...DEFAULT_SETTINGS, removeImportSilence: true });
    });

    it("drops unknown keys", () => {
        expect(parseSettings({ unknown: true, volume: 2 })).toEqual({
            ...DEFAULT_SETTINGS,
            volume: 2
        });
    });

    it("replaces values of the wrong type or out of range", () => {
        const parsed = parseSettings({
            volume: "loud",
            voiceCap: -1,
            sampleRate: 1,
            reverbLevel: NaN,
            theme: "blue",
            interpolation: 99,
            lang: "xx"
        });

        expect(parsed).toEqual(DEFAULT_SETTINGS);
    });

    it("rounds a fractional sample rate, which no context runs at", () => {
        expect(parseSettings({ sampleRate: 44_100.3 }).sampleRate).toBe(44_100);
    });

    it("keeps the MIDI input and drops one that is not text", () => {
        expect(parseSettings({ midiInputId: "port-1" }).midiInputId).toBe(
            "port-1"
        );
        expect(parseSettings({ midiInputId: 5 }).midiInputId).toBe("");
    });

    it("keeps valid values", () => {
        const valid = {
            ...DEFAULT_SETTINGS,
            lang: "pl",
            theme: "light",
            volume: 10,
            voiceCap: 0,
            sampleRate: 44_100
        };

        expect(parseSettings(valid)).toEqual(valid);
    });
});

describe("layout setting", () => {
    it("keeps a valid layout", () => {
        expect(parseSettings({ layout: "phone" }).layout).toBe("phone");
    });

    it("falls back to auto", () => {
        expect(parseSettings({ layout: "tablet" }).layout).toBe("auto");
    });
});

describe("phone grid settings", () => {
    it("keeps a valid grid mode and falls back to grid", () => {
        expect(parseSettings({ phoneGridMode: "oneZone" }).phoneGridMode).toBe(
            "oneZone"
        );
        expect(parseSettings({ phoneGridMode: "table" }).phoneGridMode).toBe(
            "grid"
        );
    });

    it("keeps Values only as a boolean", () => {
        expect(parseSettings({ phoneValuesOnly: true }).phoneValuesOnly).toBe(
            true
        );
        expect(parseSettings({ phoneValuesOnly: "yes" }).phoneValuesOnly).toBe(
            false
        );
    });

    it("keeps only known collapsed groups", () => {
        expect(
            parseSettings({ phoneCollapsedGroups: ["volume", "bogus", 3] })
                .phoneCollapsedGroups
        ).toEqual(["volume"]);
        expect(
            parseSettings({ phoneCollapsedGroups: "volume" })
                .phoneCollapsedGroups
        ).toEqual([]);
    });
});
