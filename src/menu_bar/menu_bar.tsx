import { MenuBarDropdown } from "./dropdown.tsx";
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

interface MenuBarProps {
    session: BankSession | undefined;
    /**
     * Selects an element in the active tab, used for the focus hints of undo and redo.
     */
    setView: (view: BankEditView) => void;
    showMidiPlayer: boolean;
    onToggleSettings: () => void;
    onToggleKeyboard: () => void;
    onOpenFile: () => void;
    onNewFile: () => void;
    onCloseFile: () => void;
}

export function MenuBar({
    session,
    setView,
    showMidiPlayer,
    onToggleSettings,
    onToggleKeyboard,
    onOpenFile,
    onNewFile,
    onCloseFile
}: MenuBarProps) {
    const { t } = useTranslation();
    const { undo, redo, save, removeUnusedElements, autoLinkSamples } =
        useBankCommands(session, setView);

    useEventListener(document, "keydown", (e) => {
        if (!session || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        switch (e.key) {
            case "z": {
                e.preventDefault();
                undo();
                break;
            }
            case "y": {
                e.preventDefault();
                redo();
                break;
            }
            case "s": {
                e.preventDefault();
                save("auto");
                break;
            }
        }
    });

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
                    onUndo={undo}
                    onRedo={redo}
                    onRemoveUnusedElements={removeUnusedElements}
                    onAutoLinkSamples={autoLinkSamples}
                />
            ) : null}
            {showMidiPlayer && <MIDIPlayer />}
            <a
                className={"menu_bar_button"}
                href={"https://spessasus.github.io/SpessaSynth"}
                target={"_blank"}
            >
                {"SpessaSynth"}
            </a>
            {IS_CHROME && !IS_ELECTRON && (
                <MenuBarDropdown main={t("firefox")}></MenuBarDropdown>
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
                onClick={onToggleKeyboard}
            >
                {t("keyboard")}
            </button>
            <VoiceDisplay />
            <button
                type={"button"}
                className={"menu_bar_button settings_button"}
                onClick={onToggleSettings}
                title={t("settingsLocale.settings")}
                aria-label={t("settingsLocale.settings")}
            >
                <Gear />
            </button>
        </div>
    );
}
