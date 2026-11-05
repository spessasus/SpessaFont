const { contextBridge, ipcRenderer } = require("electron");

/**
 * The renderer's side is typed in src/types/electron.ts
 * @type {import("../src/types/electron.ts").ElectronAPI}
 */
const electronAPI = {
    onFileOpened: (callback) => {
        /**
         * @param {Electron.IpcRendererEvent} _
         * @param {string} path
         */
        const listener = (_, path) => callback(path);
        ipcRenderer.on("open-file", listener);
        return () => ipcRenderer.removeListener("open-file", listener);
    },
    appReady: () => ipcRenderer.send("app-ready"),
    setUnloadPromptTexts: (texts) =>
        ipcRenderer.send("unload-prompt-texts", texts)
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
