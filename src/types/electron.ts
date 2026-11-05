/**
 * The texts of the main process's "unsaved changes" question, in the app's language.
 */
export interface UnloadPromptTexts {
    title: string;
    message: string;
    discard: string;
    keep: string;
}

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
    /**
     * Gives the main process the texts it asks with when closing or reloading the window would
     * lose unsaved changes.
     */
    setUnloadPromptTexts: (texts: UnloadPromptTexts) => void;
}

declare global {
    /**
     * Only defined in the Electron app.
     */
    var electronAPI: ElectronAPI | undefined;
}
