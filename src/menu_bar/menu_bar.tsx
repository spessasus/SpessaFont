import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import { Discord, Gear, GitHub } from "../utils/icons/app_icons.tsx";
import { IS_CHROME, IS_ELECTRON } from "../utils/environment_detection.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { useBankCommands } from "./use_bank_commands.ts";
import { FileMenu } from "./file_menu.tsx";
import { EditMenu } from "./edit_menu.tsx";
import { isEditorShortcut, isTextField } from "../utils/is_editor_shortcut.ts";

interface MenuBarProps {
    session: BankSession | undefined;
    /**
     * Selects an element in the active tab, used for the focus hints of undo and redo.
     */
    onViewChange: (view: BankEditView) => void;
    showMIDIPlayer: boolean;
    onToggleSettings: () => void;
    onToggleKeyboard: () => void;
    onOpenFile: () => void;
    onNewFile: () => void;
    onCloseFile: () => void;
    /**
     * Whether the settings cover the editor, which turns the editing shortcuts off.
     */
    isEditorCovered: boolean;
    isKeyboardShown: boolean;
}

export function MenuBar({
    session,
    onViewChange,
    showMIDIPlayer,
    onToggleSettings,
    onToggleKeyboard,
    onOpenFile,
    onNewFile,
    onCloseFile,
    isEditorCovered,
    isKeyboardShown
}: MenuBarProps) {
    const { t } = useTranslation();
    const {
        undo,
        redo,
        save,
        removeUnusedElements,
        autoLinkSamples,
        mergeDuplicateSamples
    } = useBankCommands(session, onViewChange);

    useEventListener(document, "keydown", (e) => {
        if (e.defaultPrevented || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        // Shift or Caps Lock gives upper case letters, and Ctrl+Shift+Z is redo too
        const key = e.key.toLowerCase();
        // Ctrl+S saves the bank from anywhere, the browser would save the web page instead.
        // Only a dialog or a toast question keeps it: the save's own questions could not be
        // answered behind a dialog, and a toast may be the save asking something already
        if (key === "s") {
            e.preventDefault();
            // Holding the keys would start a save for every repeat
            if (
                !session ||
                e.repeat ||
                (e.target instanceof Element &&
                    e.target.closest("dialog, [role=alertdialog]") !== null)
            ) {
                return;
            }
            // The field applies its draft when it loses the focus, so the save includes it
            if (isTextField(e.target) && e.target instanceof HTMLElement) {
                e.target.blur();
                e.target.focus();
            }
            save("auto");
            return;
        }
        if (isEditorCovered || !session || !isEditorShortcut(e)) {
            return;
        }
        switch (key) {
            case "z": {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            }
            case "y": {
                e.preventDefault();
                redo();
                break;
            }
        }
    });

    // The menus edit the active bank, so the settings make way to show what changed
    const revealed = (command: () => void) => () => {
        if (isEditorCovered) {
            onToggleSettings();
        }
        command();
    };

    return (
        <div className={"menu_bar_main"}>
            <FileMenu
                isBankOpen={session !== undefined}
                onNewFile={onNewFile}
                onOpenFile={onOpenFile}
                onCloseFile={onCloseFile}
                onSave={save}
            />
            {session ? (
                <EditMenu
                    store={session.store}
                    onUndo={revealed(undo)}
                    onRedo={revealed(redo)}
                    onRemoveUnusedElements={revealed(removeUnusedElements)}
                    onAutoLinkSamples={revealed(autoLinkSamples)}
                    onMergeDuplicateSamples={revealed(mergeDuplicateSamples)}
                />
            ) : null}
            {showMIDIPlayer && <MIDIPlayer />}
            <a
                className={"menu_bar_button"}
                href={"https://spessasus.github.io/SpessaSynth"}
                target={"_blank"}
            >
                {"SpessaSynth"}
            </a>
            {IS_CHROME && !IS_ELECTRON && (
                <span className={"menu_bar_button menu_bar_note"}>
                    {t("firefox")}
                </span>
            )}
            <div className={"menu_bar_spacer"}></div>
            <a
                className={"menu_bar_button"}
                href={"https://github.com/spessasus/SpessaFont"}
                target={"_blank"}
                title={t("githubPage")}
                aria-label={t("githubPage")}
            >
                <GitHub />
            </a>
            <a
                className={"menu_bar_button"}
                href={"https://discord.gg/TAVVxMFnsn"}
                target={"_blank"}
                title={t("discord")}
                aria-label={t("discord")}
            >
                <Discord />
            </a>
            <button
                type={"button"}
                className={"menu_bar_button"}
                aria-pressed={isKeyboardShown}
                onClick={onToggleKeyboard}
            >
                {t("keyboard")}
            </button>
            <VoiceDisplay />
            <button
                type={"button"}
                className={"menu_bar_button menu_bar_settings_button"}
                aria-pressed={isEditorCovered}
                onClick={onToggleSettings}
                title={t("settingsLocale.settings")}
                aria-label={t("settingsLocale.settings")}
            >
                <Gear />
            </button>
        </div>
    );
}
