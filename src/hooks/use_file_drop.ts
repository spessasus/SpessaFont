import { useEventListener } from "./use_event_listener.ts";
import { isTextField } from "../utils/is_editor_shortcut.ts";

/**
 * Takes files dropped anywhere on the page from the system. Without this, the browser
 * (or Electron) would open a dropped file in place of the app.
 * Other drags (a link, text from another window) are refused outside text fields, as the
 * browser would load a dropped link in place of the app too.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
    useEventListener(document, "dragover", (e) => {
        if (!e.dataTransfer) {
            return;
        }
        if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        } else if (!isTextField(e.target)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "none";
        }
    });
    useEventListener(document, "drop", (e) => {
        const files = [...(e.dataTransfer?.files ?? [])];
        if (files.length > 0) {
            e.preventDefault();
            onFiles(files);
        } else if (!isTextField(e.target)) {
            e.preventDefault();
        }
    });
}
