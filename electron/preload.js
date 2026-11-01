const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    onFileOpened: (callback) => {
        const listener = (_, path) => callback(path);
        ipcRenderer.on("open-file", listener);
        return () => ipcRenderer.removeListener("open-file", listener);
    },
    appReady: () => ipcRenderer.send("app-ready")
});
