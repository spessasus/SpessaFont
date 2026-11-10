import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import { Discord, Gear, GitHub } from "../utils/icons/app_icons.tsx";
import { IS_CHROME, IS_ELECTRON } from "../utils/environment_detection.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankShortcutKeys } from "../hooks/use_bank_shortcut_keys.ts";
import { useBankCommands } from "./use_bank_commands.ts";
import { FileMenu } from "./file_menu.tsx";
import { EditMenu } from "./edit_menu.tsx";

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
    /**
     * Receives the place for the shown element's tools menu, which the editor renders.
     */
    toolsMenuSlotRef: (node: HTMLDivElement | null) => void;
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
    isKeyboardShown,
    toolsMenuSlotRef
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

    useBankShortcutKeys(
        session !== undefined,
        { undo, redo, save },
        isEditorCovered
    );

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
            <div ref={toolsMenuSlotRef} className={"menu_bar_tools_slot"} />
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
