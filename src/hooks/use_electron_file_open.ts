import { useEffect, useEffectEvent } from "react";
import { logInfo } from "../utils/core_utils.ts";
import { getFileName, toFileURL } from "../utils/file_path.ts";

/**
 * Receives the files the OS opens with the Electron app, and tells Electron the app is ready.
 * Calls `onError` with the path when the file cannot be read.
 */
export function useElectronFileOpen(
    onFile: (file: File) => Promise<void>,
    onError: (path: string, error: unknown) => void
) {
    const handleFile = useEffectEvent(onFile);
    const handleError = useEffectEvent(onError);
    useEffect(() => {
        const api = globalThis.electronAPI;
        if (!api) {
            return;
        }
        const openPath = async (path: string) => {
            logInfo(`Attempting to open ${path}`);
            try {
                const response = await fetch(toFileURL(path));
                const blob = await response.blob();
                const name = getFileName(path);
                await handleFile(new File([blob], name));
            } catch (error) {
                handleError(path, error);
            }
        };
        const unsubscribe = api.onFileOpened((path) => void openPath(path));
        // The main process only handles the first signal, so a repeat under StrictMode is harmless
        api.appReady();
        logInfo("Connected to Electron file handlers");
        return unsubscribe;
    }, []);
}
