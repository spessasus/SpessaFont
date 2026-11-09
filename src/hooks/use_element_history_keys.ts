import { useLayout } from "../layout/layout_context.ts";
import { IS_MAC } from "../utils/environment_detection.ts";
import {
    isEditorShortcut,
    isInModal,
    isTextField
} from "../utils/is_editor_shortcut.ts";
import { useEventListener } from "./use_event_listener.ts";

/**
 * Alt+Left and Right, and the mouse's side buttons, go back and forward between elements.
 * The page has no history of its own, so the browser would leave it instead, even where
 * the keys do nothing in the app (a field, a dialog, the settings).
 * Phones leave them to the browser, whose back press runs the back stack like Android's back
 * does, so the drill depth stays in step with the tab's trail.
 */
export function useElementHistoryKeys(
    isEditorShown: boolean,
    goBack: () => void,
    goForward: () => void
) {
    const isPhone = useLayout() === "phone";
    useEventListener(document, "keydown", (e) => {
        if (
            isPhone ||
            e.defaultPrevented ||
            !e.altKey ||
            (e.key !== "ArrowLeft" && e.key !== "ArrowRight")
        ) {
            return;
        }
        // On macOS Option and an arrow move the cursor by a word
        if (IS_MAC && isTextField(e.target)) {
            return;
        }
        e.preventDefault();
        if (!isEditorShown || !isEditorShortcut(e)) {
            return;
        }
        if (e.key === "ArrowLeft") {
            goBack();
        } else {
            goForward();
        }
    });
    useEventListener(document, "mousedown", (e) => {
        if (!isPhone && (e.button === 3 || e.button === 4)) {
            e.preventDefault();
        }
    });
    useEventListener(document, "mouseup", (e) => {
        if (isPhone || (e.button !== 3 && e.button !== 4)) {
            return;
        }
        e.preventDefault();
        // Nothing changes behind a dialog
        if (!isEditorShown || isInModal(e.target)) {
            return;
        }
        if (e.button === 3) {
            goBack();
        } else {
            goForward();
        }
    });
}
