import path from "node:path";
import {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu,
    nativeImage,
    shell
} from "electron";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

const devServerUrl = "http://localhost:5173/";
const distIndex = path.join(app.getAppPath(), "dist", "index.html");
const preloadPath = path.join(app.getAppPath(), "electron", "preload.js");
const windowIcon = nativeImage.createFromPath(
    path.join(app.getAppPath(), "public", "logo.png")
);

// Keep in sync with `ACCEPTED_SOUNDBANK_FORMATS` in src/utils/accepted_formats.ts
// (src is not packaged with the app, so it can't be imported here)
const ACCEPTED_SOUNDBANK_FORMATS =
    ".sf2,.dls,.dlp,.sf3,.sf4,.sfogg,.rmi,.xm,.mod,.s3m".split(",");

let fileToOpen = undefined;

/**
 * @type {Electron.CrossProcessExports.BrowserWindow}
 */
let mainWindow = null;

app.on("open-file", (event, path) => {
    event.preventDefault();

    console.info("macOS requested file open:", path);

    // On macOS the window can be closed while the app keeps running
    if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send("open-file", path);
    else fileToOpen = path;
});

const DEV_MODE = !app.isPackaged;

async function createWindow() {
    // Hide menu
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        backgroundColor: "#000",
        width: 1280,
        height: 900,
        title: "SpessaFont SF2/DLS Editor",
        icon: windowIcon,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: DEV_MODE,
            nodeIntegration: false,
            preload: preloadPath
        }
    });
    // Shown as soon as it can paint, so an app that fails to start still shows its error screen
    mainWindow.once("ready-to-show", () => mainWindow.show());

    // Links (GitHub, downloads) open in the browser, not in a window with the app's preload
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://") || url.startsWith("http://")) {
            void shell.openExternal(url);
        }
        return { action: "deny" };
    });

    // Electron cancels a prevented unload silently, so ask the way a browser does
    mainWindow.webContents.on("will-prevent-unload", (event) => {
        const choice = dialog.showMessageBoxSync(mainWindow, {
            type: "warning",
            buttons: ["Leave", "Stay"],
            defaultId: 1,
            cancelId: 1,
            title: "Unsaved changes",
            message: "Some sound banks have unsaved changes. Leave anyway?"
        });
        if (choice === 0) {
            event.preventDefault();
        }
    });

    if (DEV_MODE) {
        console.info("DEVELOPER MODE");
        // Devtools handler
        mainWindow.webContents.on("before-input-event", (event, input) => {
            if (input.key === "F12" && input.type === "keyDown")
                mainWindow.webContents.toggleDevTools();
        });
    }
    // Registered before loading, so a fast app cannot send it too early
    ipcMain.once("app-ready", () => {
        console.info("Application is loaded!");

        if (process.platform !== "darwin") {
            fileToOpen = process.argv.find((arg) => {
                const a = arg.toLowerCase();
                return ACCEPTED_SOUNDBANK_FORMATS.some((ext) =>
                    a.endsWith(ext)
                );
            });
        }

        if (fileToOpen) {
            console.info(`Sending ${fileToOpen} to webContents`);
            mainWindow.webContents.send("open-file", fileToOpen);
            fileToOpen = null;
        }
    });

    await (DEV_MODE
        ? mainWindow.loadURL(devServerUrl)
        : mainWindow.loadFile(distIndex));
}

app.whenReady().then(async () => {
    await createWindow();
    // The window does not wait for the network, and a failed check (offline) is only logged
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify().catch((error) => {
            console.error("Update check failed:", error);
        });
    }
});

// macOS keeps the app running without windows, a click on the dock icon opens one again
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
