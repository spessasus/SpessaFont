import { describe, expect, it } from "vitest";
import { isLandscapeScreen } from "./orientation.ts";

describe("isLandscapeScreen", () => {
    it("is landscape when the screen and the viewport are", () => {
        expect(isLandscapeScreen("landscape-primary", 915, 412)).toBe(true);
    });

    it("stays portrait while the soft keyboard shrinks the viewport", () => {
        expect(isLandscapeScreen("portrait-primary", 412, 300)).toBe(false);
    });

    it("follows the viewport where screen orientation is missing", () => {
        expect(isLandscapeScreen(undefined, 915, 412)).toBe(true);
        expect(isLandscapeScreen(undefined, 412, 915)).toBe(false);
    });

    it("is portrait for a portrait viewport on a landscape screen", () => {
        expect(isLandscapeScreen("landscape-primary", 412, 915)).toBe(false);
    });
});
