const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    onFileOpened: (callback) => {
        ipcRenderer.on("open-file", (_, path) => callback(path));
    },
    appReady: () => ipcRenderer.send("app-ready")
});
