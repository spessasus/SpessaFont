import path from "node:path";
import { fileURLToPath } from "node:url";
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

const IS_DEV_MODE = !app.isPackaged;

/**
 * Files the OS asked to open before the page could take them.
 * @type {string[]}
 */
const pendingFiles = [];

const state = {
    /**
     * @type {BrowserWindow | undefined}
     */
    mainWindow: undefined,
    // Set when the page listens for opened files, cleared whenever it loads again
    isPageReady: false,
    // English until the page sends the texts in the app's language
    unloadPrompt: {
        title: "Unsaved changes",
        message: "Some sound banks have unsaved changes. Discard them?",
        discard: "Discard",
        keep: "Keep"
    }
};

function getOpenWindow() {
    const window = state.mainWindow;
    return window && !window.isDestroyed() ? window : undefined;
}

/**
 * Sends a file to the page, or keeps it until the page is ready for it.
 * @param {string} filePath
 */
function openFile(filePath) {
    const window = getOpenWindow();
    if (window && state.isPageReady) {
        console.info(`Sending ${filePath} to webContents`);
        window.webContents.send("open-file", filePath);
    } else {
        pendingFiles.push(filePath);
    }
}

/**
 * The sound bank files on a command line. A relative path (from a terminal) is resolved
 * against the directory the command ran in, or the page would look for it at the root.
 * Linux file managers may pass file:// URLs instead of paths.
 * @param {string[]} argv
 * @param {string} workingDirectory
 */
function findFilesInArgs(argv, workingDirectory) {
    return argv
        .filter((arg) => {
            const a = arg.toLowerCase();
            return (
                !a.startsWith("-") &&
                ACCEPTED_SOUNDBANK_FORMATS.some((ext) => a.endsWith(ext))
            );
        })
        .map((arg) =>
            arg.startsWith("file://")
                ? fileURLToPath(arg)
                : path.resolve(workingDirectory, arg)
        );
}

/**
 * Whether a URL is the app's own page, with any query (the "?samplerate=" reload).
 * @param {string} url
 * @param {string} currentUrl
 */
function isAppPage(url, currentUrl) {
    if (!URL.canParse(url) || !URL.canParse(currentUrl)) {
        return false;
    }
    const target = new URL(url);
    const current = new URL(currentUrl);
    return (
        target.protocol === current.protocol &&
        target.host === current.host &&
        target.pathname === current.pathname
    );
}

// Without a menu there are no zoom keys, and on macOS no copy and paste in text fields.
// macOS always shows its menu bar, the other systems get the zoom keys without one.
function setUpMenu() {
    if (process.platform !== "darwin") {
        Menu.setApplicationMenu(null);
        return;
    }
    Menu.setApplicationMenu(
        Menu.buildFromTemplate([
            { role: "appMenu" },
            { role: "editMenu" },
            { role: "viewMenu" },
            { role: "windowMenu" }
        ])
    );
}

async function createWindow() {
    const window = new BrowserWindow({
        backgroundColor: "#000",
        width: 1280,
        height: 900,
        title: "SpessaFont SF2/DLS Editor",
        icon: windowIcon,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: IS_DEV_MODE,
            nodeIntegration: false,
            preload: preloadPath
        }
    });
    state.mainWindow = window;
    state.isPageReady = false;
    // Shown as soon as it can paint, so an app that fails to start still shows its error screen
    window.once("ready-to-show", () => window.show());
    window.on("closed", () => {
        if (state.mainWindow !== window) {
            return;
        }
        state.mainWindow = undefined;
        state.isPageReady = false;
    });

    const contents = window.webContents;
    // Links (GitHub, downloads) open in the browser, not in a window with the app's preload
    contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://") || url.startsWith("http://")) {
            void shell.openExternal(url);
        }
        return { action: "deny" };
    });

    // A link dropped on the window would replace the app, which has no back button,
    // and the site would get the preload's API. Downloads of saved files use blob URLs.
    contents.on("will-navigate", (event, url) => {
        if (isAppPage(url, contents.getURL()) || url.startsWith("blob:")) {
            return;
        }
        event.preventDefault();
        if (url.startsWith("https://") || url.startsWith("http://")) {
            void shell.openExternal(url);
        }
    });

    // The page listens for files again after every load (the sample rate reload)
    contents.on("did-start-loading", () => {
        state.isPageReady = false;
    });

    // Electron cancels a prevented unload silently, so ask the way a browser does
    contents.on("will-prevent-unload", (event) => {
        const { title, message, discard, keep } = state.unloadPrompt;
        const choice = dialog.showMessageBoxSync(window, {
            type: "warning",
            buttons: [discard, keep],
            defaultId: 1,
            cancelId: 1,
            title,
            message
        });
        if (choice === 0) {
            event.preventDefault();
        }
    });

    // macOS zooms from its menu
    if (process.platform !== "darwin") {
        contents.on("before-input-event", (event, input) => {
            if (input.type !== "keyDown" || !input.control || input.alt) {
                return;
            }
            const level = contents.getZoomLevel();
            switch (input.key) {
                case "+":
                case "=": {
                    contents.setZoomLevel(level + 0.5);
                    break;
                }
                case "-": {
                    contents.setZoomLevel(level - 0.5);
                    break;
                }
                case "0": {
                    contents.setZoomLevel(0);
                    break;
                }
                default: {
                    return;
                }
            }
            event.preventDefault();
        });
    }

    if (IS_DEV_MODE) {
        console.info("DEVELOPER MODE");
        // Devtools handler
        contents.on("before-input-event", (_, input) => {
            if (input.key === "F12" && input.type === "keyDown")
                contents.toggleDevTools();
        });
    }

    try {
        await (IS_DEV_MODE
            ? window.loadURL(devServerUrl)
            : window.loadFile(distIndex));
    } catch (error) {
        console.error("Could not load the app:", error);
    }
}

// The window does not wait for the network, and a failed check (offline) is only logged
async function checkForUpdates() {
    try {
        await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
        console.error("Update check failed:", error);
    }
}

function start() {
    // The files the app was started with
    for (const file of findFilesInArgs(process.argv, process.cwd())) {
        pendingFiles.push(file);
    }

    // A file opened from the OS while the app runs becomes a tab in the open window
    app.on("second-instance", (_, argv, workingDirectory) => {
        for (const file of findFilesInArgs(argv, workingDirectory)) {
            openFile(file);
        }
        const window = getOpenWindow();
        if (!window) {
            return;
        }
        if (window.isMinimized()) window.restore();
        window.focus();
    });

    app.on("open-file", (event, filePath) => {
        event.preventDefault();
        console.info("macOS requested file open:", filePath);
        openFile(filePath);
        // On macOS the window can be closed while the app keeps running
        if (app.isReady() && !getOpenWindow()) void createWindow();
    });

    // Registered before loading, so a fast app cannot send it too early
    ipcMain.on("app-ready", (event) => {
        if (event.sender !== getOpenWindow()?.webContents) {
            return;
        }
        console.info("Application is loaded!");
        state.isPageReady = true;
        for (const file of pendingFiles.splice(0)) {
            openFile(file);
        }
    });

    ipcMain.on("unload-prompt-texts", (event, texts) => {
        if (event.sender !== getOpenWindow()?.webContents) {
            return;
        }
        const { title, message, discard, keep } = texts ?? {};
        if (
            [title, message, discard, keep].every(
                (text) => typeof text === "string"
            )
        ) {
            state.unloadPrompt = { title, message, discard, keep };
        }
    });

    void app.whenReady().then(() => {
        setUpMenu();
        // Started before the window, so a build whose page fails to load can still update.
        // The portable build cannot update itself, electron-updater would run the installer.
        if (app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE) {
            void checkForUpdates();
        }
        void createWindow();
    });

    // macOS keeps the app running without windows, a click on the dock icon opens one again
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
}

// One instance, the second one passes its files to the first and quits
if (app.requestSingleInstanceLock()) {
    start();
} else {
    app.quit();
}
