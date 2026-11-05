import { describe, expect, it } from "vitest";
import { getFileName, toFileURL } from "./file_path.ts";

describe("toFileURL", () => {
    it("keeps # and ? as part of the file name", () => {
        const url = new URL(toFileURL("/home/u/Kit #1 what?.sf2"));
        expect(url.hash).toBe("");
        expect(url.search).toBe("");
        expect(decodeURIComponent(url.pathname)).toBe(
            "/home/u/Kit #1 what?.sf2"
        );
    });

    it("does not decode a percent sign in a name", () => {
        const url = new URL(toFileURL("/tmp/100%41.sf2"));
        expect(decodeURIComponent(url.pathname)).toBe("/tmp/100%41.sf2");
    });

    it("turns a Windows path into a file URL", () => {
        const url = new URL(toFileURL(String.raw`C:\Banks\My Bank.sf2`));
        expect(url.pathname).toBe("/C:/Banks/My%20Bank.sf2");
    });
});

describe("getFileName", () => {
    it("takes the name after either kind of slash", () => {
        expect(getFileName("/home/u/a.sf2")).toBe("a.sf2");
        expect(getFileName(String.raw`C:\Banks\b.sf2`)).toBe("b.sf2");
    });
});
