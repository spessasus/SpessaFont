import { describe, expect, it, vi } from "vitest";
import {
    DEFAULT_RELEASE_URL,
    fetchDesktopDownloads
} from "./desktop_downloads.ts";

function stubResponse(body: unknown, status = 200) {
    vi.stubGlobal("fetch", () =>
        Promise.resolve(Response.json(body, { status }))
    );
}

function asset(name: string) {
    return { name, browser_download_url: `https://example.com/${name}` };
}

describe("fetchDesktopDownloads", () => {
    it("falls back to the latest release page", () => {
        expect(DEFAULT_RELEASE_URL).toBe(
            "https://github.com/spessasus/SpessaFont/releases/latest"
        );
    });

    it("throws when the API answers with an error", async () => {
        // The unauthenticated rate limit answers 403 with a message and no assets
        stubResponse({ message: "API rate limit exceeded" }, 403);
        await expect(fetchDesktopDownloads()).rejects.toThrow("403");
    });

    it("finds each download by its file name", async () => {
        stubResponse({
            assets: [
                asset("SpessaFont-Setup-1.5.0.exe"),
                asset("SpessaFont-1.5.0-portable.exe"),
                asset("SpessaFont-1.5.0.AppImage"),
                asset("spessafont_1.5.0_amd64.deb"),
                asset("latest.yml")
            ]
        });
        expect(await fetchDesktopDownloads()).toEqual({
            windowsInstaller: "https://example.com/SpessaFont-Setup-1.5.0.exe",
            windowsPortable:
                "https://example.com/SpessaFont-1.5.0-portable.exe",
            linuxAppImage: "https://example.com/SpessaFont-1.5.0.AppImage",
            debianPackage: "https://example.com/spessafont_1.5.0_amd64.deb"
        });
    });
});
