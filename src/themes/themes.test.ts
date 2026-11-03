import { describe, expect, it } from "vitest";
import { isTheme, THEME_LIST } from "./theme_list.ts";

// Variables a theme may leave out, the base styles have a fallback for them
const OPTIONAL = new Set(["--scrollbar-colors", "--main-font"]);

const FILES = import.meta.glob<string>("./*.css", {
    query: "?raw",
    import: "default",
    eager: true
});

function readTheme(file: string) {
    const css = FILES[file];
    if (css === undefined) {
        throw new Error(`Theme file ${file} does not exist.`);
    }
    return css;
}

/**
 * The required variables a theme file sets, sorted.
 */
function getVariables(css: string) {
    return Array.from(css.matchAll(/^\s*(--[\w-]+):/gm), (m) => m[1])
        .filter((name) => !OPTIONAL.has(name))
        .toSorted((a, b) => a.localeCompare(b));
}

describe("themes", () => {
    const dark = getVariables(readTheme("./dark.css"));
    const imports = readTheme("./themes.css");

    it.each(Object.keys(THEME_LIST))(
        "%s is imported and sets every variable dark sets",
        (id) => {
            const css = readTheme(`./${id}.css`);
            expect(css).toContain(`:root[data-theme="${id}"]`);
            expect(imports).toContain(`@import "./${id}.css";`);
            // An empty file list would pass, so make sure the files were read
            expect(dark.length).toBeGreaterThan(20);
            expect(getVariables(css)).toEqual(dark);
        }
    );

    it("accepts only listed theme IDs", () => {
        expect(isTheme("teal")).toBe(true);
        expect(isTheme("blue")).toBe(false);
        expect(isTheme("toString")).toBe(false);
        expect(isTheme(5)).toBe(false);
    });
});
