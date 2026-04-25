export const IS_ELECTRON = navigator.userAgent.includes("Electron");
export const IS_CHROME =
    !IS_ELECTRON &&
    // @ts-expect-error chromium check is here
    globalThis.chrome !== undefined;
