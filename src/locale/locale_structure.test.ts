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

describe("locales", () => {
    const english = getShape(LocaleList.en.translation);
    it.each(Object.keys(LocaleList).filter((code) => code !== "en"))(
        "%s has the same keys and placeholders as English",
        (code) => {
            expect(getShape(LocaleList[code].translation)).toEqual(english);
        }
    );
});
