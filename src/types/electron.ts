/**
 * The API exposed by `electron/preload.js`.
 */
export interface ElectronAPI {
    /**
     * Calls back with the path of every file the OS asks the app to open.
     * Returns a function that removes the listener.
     */
    onFileOpened: (callback: (path: string) => void) => () => void;
    /**
     * Tells the main process that the renderer listens for opened files.
     */
    appReady: () => void;
}

declare global {
    /**
     * Only defined in the Electron app.
     */
    var electronAPI: ElectronAPI | undefined;
}
