const RELEASES_API =
    "https://api.github.com/repos/spessasus/SpessaFont/releases/latest";
export const DEFAULT_RELEASE_URL =
    "https://github.com/spessasus/SpessaFont/releases/tag/v1.2.0";

export interface DesktopDownloads {
    windowsInstaller: string;
    windowsPortable: string;
    linuxAppImage: string;
    debianPackage: string;
}

interface ReleaseAsset {
    browser_download_url: string;
    name: string;
}

/**
 * Finds the desktop app downloads of the latest release.
 * Returns undefined when the release has no assets. Missing assets link to the release page.
 */
export async function fetchDesktopDownloads(): Promise<
    DesktopDownloads | undefined
> {
    const response = await fetch(RELEASES_API);
    const release = (await response.json()) as { assets?: ReleaseAsset[] };
    const assets = release.assets;
    if (!assets) {
        return undefined;
    }
    const find = (isMatch: (name: string) => boolean) =>
        assets.find((a) => isMatch(a.name))?.browser_download_url ??
        DEFAULT_RELEASE_URL;
    return {
        windowsInstaller: find(
            (n) => n.endsWith(".exe") && n.includes("Setup")
        ),
        windowsPortable: find(
            (n) => n.endsWith(".exe") && !n.includes("Setup")
        ),
        linuxAppImage: find((n) => n.endsWith("AppImage")),
        debianPackage: find((n) => n.endsWith(".deb"))
    };
}
