import { useEventListener } from "./use_event_listener.ts";

/**
 * Takes files dropped anywhere on the page from the system. Without this, the browser
 * (or Electron) would open a dropped file in place of the app.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
    useEventListener(document, "dragover", (e) => {
        if (!e.dataTransfer?.types.includes("Files")) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });
    useEventListener(document, "drop", (e) => {
        const files = [...(e.dataTransfer?.files ?? [])];
        if (files.length === 0) {
            return;
        }
        e.preventDefault();
        onFiles(files);
    });
}
