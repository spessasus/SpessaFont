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
