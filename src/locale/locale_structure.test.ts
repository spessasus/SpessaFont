import { describe, expect, it } from "vitest";
import { LocaleList } from "./locale_list.ts";

const byText = (a: string, b: string) => a.localeCompare(b);

/**
 * Every key path in a locale, each string with its `{{placeholders}}`.
 */
function getShape(value: unknown, path = ""): string[] {
    if (typeof value === "string") {
        const placeholders = Array.from(
            value.matchAll(/{{\s*(\w+)\s*}}/g),
            (m) => m[1]
        ).toSorted(byText);
        return [`${path} ${placeholders.join(",")}`];
    }
    return typeof value === "object" && value !== null
        ? Object.entries(value)
              .flatMap(([key, child]) =>
                  getShape(child, path ? `${path}.${key}` : key)
              )
              .toSorted(byText)
        : [`${path} (${typeof value})`];
}

// Only English and Polish are kept complete. The others may miss keys, which fall back to English
describe("locales", () => {
    const english = new Set(getShape(LocaleList.en.translation));
    it.each(Object.keys(LocaleList).filter((code) => code !== "en"))(
        "%s only has keys and placeholders that English has",
        (code) => {
            expect(
                getShape(LocaleList[code].translation).filter(
                    (entry) => !english.has(entry)
                )
            ).toEqual([]);
        }
    );

    it("pl has every key of English", () => {
        expect(getShape(LocaleList.pl.translation)).toEqual([...english]);
    });
});
