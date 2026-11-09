import { describe, expect, it } from "vitest";

const files = import.meta.glob<string>(
    [
        "./**/*_phone.css",
        "./index_phone.css",
        "./context_menu/action_sheet.css",
        "./fancy_inputs/segmented_control/segmented_control.css",
        "./fancy_inputs/stepper_button/stepper_button.css",
        "./menu_list/selection_mode/selection_mode.css",
        "./phone_shell/**/*.css"
    ],
    { query: "?raw", import: "default", eager: true }
);

const SCOPE = ':root[data-layout="phone"]';

/**
 * At-rules whose blocks hold no selectors. Every other block at-rule (media, supports,
 * starting-style, layer, container, scope and whatever comes next) is entered.
 */
const SKIPPED_AT_RULES = new Set([
    "keyframes",
    "-webkit-keyframes",
    "-moz-keyframes",
    "-o-keyframes",
    "font-face",
    "property",
    "counter-style",
    "page",
    "font-feature-values",
    "font-palette-values",
    "view-transition"
]);

/**
 * Lists every selector of the stylesheet that needs the phone scope. Keyframe steps and
 * font-face descriptors are skipped, every other block at-rule is entered.
 */
function findSelectors(css: string) {
    const text = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
    const selectors = new Array<string>();
    // Each entry is whether the block we are inside holds selectors we should check
    const stack = new Array<boolean>();
    let start = 0;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === "{") {
            const prelude = text.slice(start, i).trim();
            const isParentChecked = stack.length === 0 || stack.at(-1) === true;
            if (prelude.startsWith("@")) {
                const name = /^@([\w-]+)/.exec(prelude)?.[1] ?? "";
                stack.push(isParentChecked && !SKIPPED_AT_RULES.has(name));
            } else if (isParentChecked) {
                // A style rule has declarations only, so skip to its end
                selectors.push(prelude);
                const end = text.indexOf("}", i);
                if (end === -1) {
                    throw new Error(`Unclosed block after "${prelude}"`);
                }
                i = end;
                start = end + 1;
                continue;
            } else {
                stack.push(false);
            }
            start = i + 1;
        } else if (char === "}") {
            stack.pop();
            start = i + 1;
        } else if (char === ";" && stack.at(-1) !== false) {
            // A statement such as @import has no block
            start = i + 1;
        }
    }
    if (stack.length > 0) {
        throw new Error("Unclosed at-rule block at the end of the stylesheet");
    }
    return selectors;
}

/**
 * Splits a selector list on its top level commas.
 */
function splitSelectorList(list: string) {
    const parts = new Array<string>();
    let depth = 0;
    let current = "";
    for (const char of list) {
        if (char === "(" || char === "[") {
            depth += 1;
        } else if (char === ")" || char === "]") {
            depth -= 1;
        }
        if (char === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    parts.push(current.trim());
    return parts;
}

/**
 * Returns the selectors that do not start with the phone scope.
 */
function findUnscoped(css: string) {
    return findSelectors(css)
        .flatMap((list) => splitSelectorList(list))
        .filter(
            (selector) =>
                selector !== SCOPE &&
                !selector.startsWith(`${SCOPE} `) &&
                !selector.startsWith(`${SCOPE}.`) &&
                !selector.startsWith(`${SCOPE}:`) &&
                !selector.startsWith(`${SCOPE}[`)
        );
}

describe("phone CSS", () => {
    it("has phone files", () => {
        expect(Object.keys(files).length).toBeGreaterThan(0);
    });

    it("finds the selectors of nested blocks and skips keyframes", () => {
        const css = `
            @keyframes spin { from { a: b } 50% { a: c } to { a: d } }
            @font-face { font-family: x; }
            @media (width < 10px) { .a, .b { x: y } @supports (a: b) { .c { x: y } } }
            .d { x: y }
        `;
        expect(findSelectors(css)).toEqual([".a, .b", ".c", ".d"]);
    });

    it("sees an unscoped rule inside a media block", () => {
        const css = `@media (width < 10px) { .a { x: y } }`;
        expect(findSelectors(css)).toEqual([".a"]);
    });

    it("sees an unscoped rule inside starting-style, layer and container", () => {
        const css = `@starting-style { .x { a: b } }
            @layer a, b;
            @layer c { .y { a: b } }
            @container (width > 1px) { .z { a: b } }`;
        expect(findUnscoped(css)).toEqual([".x", ".y", ".z"]);
    });

    it("checks every part of a selector list", () => {
        const css = `.foo, ${SCOPE} .bar, ${SCOPE}:hover .baz { a: b }`;
        expect(findUnscoped(css)).toEqual([".foo"]);
    });

    it("throws on an unclosed block", () => {
        expect(() => findSelectors(".a { x: y")).toThrow("Unclosed");
        expect(() => findSelectors("@media (a) { .a { x: y }")).toThrow(
            "Unclosed"
        );
    });

    it.each(Object.entries(files))(
        "%s scopes every rule to the phone layout",
        (_path, css) => {
            const unscoped = findUnscoped(css);
            expect(unscoped).toEqual([]);
        }
    );
});
