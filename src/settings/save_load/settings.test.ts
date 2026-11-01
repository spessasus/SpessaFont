import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LOCALE, getUserLocale } from "./get_user_locale.ts";
import { loadSettings } from "./load.ts";
import {
    DEFAULT_SETTINGS,
    getSetting,
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

    // Known bug: it returns the raw browser language (for example "de-DE"),
    // which the language picker has no option for.
    it.fails("falls back to the default locale when nothing matches", () => {
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

    it("lets getSetting fill in keys missing from older saves", () => {
        localStorage.setItem(
            SPESSAFONT_SETTINGS_KEY,
            JSON.stringify({ volume: 0.5 })
        );
        const settings = loadSettings();

        expect(getSetting("volume", settings)).toBe(0.5);
        expect(getSetting("voiceCap", settings)).toBe(
            DEFAULT_SETTINGS.voiceCap
        );
    });

    // Known bug: corrupt data throws from JSON.parse before the app renders, which
    // leaves a blank page. REFACTOR_PLAN.md phase 3 adds a validating parser.
    it.fails(
        "falls back to the defaults when the saved data is corrupt",
        () => {
            localStorage.setItem(SPESSAFONT_SETTINGS_KEY, "{not json");

            expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
        }
    );
});
