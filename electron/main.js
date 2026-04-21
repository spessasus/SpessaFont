import path from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage } from "electron";

const devServerUrl = "http://localhost:5173/";
const distIndex = path.join(app.getAppPath(), "dist", "index.html");

let fileToOpen = undefined;

/**
 * @type {null|BrowserWindow}
 */
let mainWindow = null;

app.on("open-file", (event, path) => {
    event.preventDefault();

    console.info("macOS requested file open:", path);

    if (mainWindow) mainWindow.webContents.send("open-file", path);
    else fileToOpen = path;
});

const DEV_MODE = !app.isPackaged;

async function createWindow() {
    const windowIcon = nativeImage.createFromPath(
        path.join(app.getAppPath(), "public", "logo.png")
    );
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
            preload: new URL("./preload.js", import.meta.url).pathname
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
    await (DEV_MODE
        ? mainWindow.loadURL(devServerUrl)
        : mainWindow.loadFile(distIndex));

    console.info("Searching for opened files");

    // Sent from the main thread
    ipcMain.once("app-ready", () => {
        console.info("Application is loaded!");
        mainWindow.show();

        if (process.platform !== "darwin") {
            fileToOpen = process.argv.find((arg) => {
                const a = arg.toLowerCase();
                return (
                    a.endsWith(".sf2") ||
                    a.endsWith(".dls") ||
                    a.endsWith(".dlp") ||
                    a.endsWith(".sf3") ||
                    a.endsWith(".sfogg") ||
                    a.endsWith(".rmi")
                );
            });
        }

        if (fileToOpen) {
            console.info(`Sending ${fileToOpen} to webContents`);
            mainWindow.webContents.send("open-file", fileToOpen);
            fileToOpen = null;
        }
    });
}

//autoUpdater.checkForUpdatesAndNotify().then(() =>
app.whenReady().then(() => {
    void createWindow();
});
//);
