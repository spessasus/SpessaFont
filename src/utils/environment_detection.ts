export const IS_ELECTRON = navigator.userAgent.includes("Electron");
// Chromium-based browsers define a `chrome` global
export const IS_CHROME = !IS_ELECTRON && "chrome" in globalThis;
