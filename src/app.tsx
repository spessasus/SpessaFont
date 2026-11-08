import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { BankEditor } from "./bank_editor/bank_editor.tsx";
import { ACCEPTED_SOUNDBANK_FORMATS } from "./utils/accepted_formats.ts";
import toast, { Toaster } from "react-hot-toast";
import "./toasts/toasts.css";
import "./app.css";
import { Welcome } from "./welcome/welcome.tsx";
import { logError, logInfo } from "./utils/core_utils.ts";
import { useAudioEngine } from "./core_backend/audio_engine_context.ts";
import { useMIDIInput } from "./keyboard/use_midi_input.ts";
import { useBankTabs } from "./tab_list/use_bank_tabs.ts";
import { useBankFileOpener } from "./hooks/use_bank_file_opener.ts";
import { useLaunchQueue } from "./hooks/use_launch_queue.ts";
import { useElectronFileOpen } from "./hooks/use_electron_file_open.ts";
import { useEventListener } from "./hooks/use_event_listener.ts";
import {
    isEditorShortcut,
    isInModal,
    isTextField
} from "./utils/is_editor_shortcut.ts";
import { useUncaughtErrorToasts } from "./hooks/use_uncaught_error_toasts.ts";
import { pickFile } from "./utils/pick_file.ts";
import { getFileName } from "./utils/file_path.ts";
import { useFileDrop } from "./hooks/use_file_drop.ts";
import { useSampleImport } from "./menu_list/use_sample_import.ts";
import { ErrorBoundary } from "./error_boundary/error_boundary.tsx";
import { renderPartError } from "./error_boundary/render_part_error.tsx";
import { IS_MAC } from "./utils/environment_detection.ts";
import { rememberFocus } from "./utils/focus_return.ts";
import { ToolsMenuSlotContext } from "./menu_bar/tools_menu_slot.ts";
import { useLayout } from "./layout/layout_context.ts";
import { PhoneShell } from "./phone_shell/phone_shell.tsx";

const SOUND_BANK_EXTENSIONS = ACCEPTED_SOUNDBANK_FORMATS.split(",");

function isSoundBankFile(file: File) {
    const name = file.name.toLowerCase();
    return SOUND_BANK_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function App() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const layout = useLayout();
    useUncaughtErrorToasts();
    useMIDIInput();
    const bankTabs = useBankTabs();
    const {
        tabs,
        activeSession,
        activeView,
        openSession,
        requestClose,
        activate,
        setActiveView,
        setSessionView,
        goBack,
        goForward
    } = bankTabs;
    const importSamples = useSampleImport();
    const [isKeyboardShown, setIsKeyboardShown] = useState(false);
    const [areSettingsShown, setAreSettingsShown] = useState(false);
    // Gives the focus back to where it was when the settings opened
    const restoreSettingsFocus = useRef<(() => void) | null>(null);

    const closeSettings = () => {
        setAreSettingsShown(false);
        restoreSettingsFocus.current?.();
        restoreSettingsFocus.current = null;
    };
    // The editor puts its tools menu here, see ToolsMenu
    const [toolsMenuSlot, setToolsMenuSlot] = useState<HTMLDivElement | null>(
        null
    );
    const toolsMenuContext = {
        node: toolsMenuSlot,
        onReveal: () => {
            if (areSettingsShown) {
                closeSettings();
            }
        }
    };
    const toggleSettings = () => {
        if (areSettingsShown) {
            closeSettings();
            return;
        }
        restoreSettingsFocus.current = rememberFocus();
        setAreSettingsShown(true);
    };

    // A bank opened while the settings are shown would stay hidden behind them
    const openBankFile = useBankFileOpener((session) => {
        setAreSettingsShown(false);
        restoreSettingsFocus.current = null;
        openSession(session);
    });

    // Files opened by the OS arrive without a user gesture on the page
    const openFileFromOS = async (file: File) => {
        await audioEngine.context.resume();
        logInfo(`Opening file ${file.name}`);
        await openBankFile(file);
    };
    useLaunchQueue(openFileFromOS);
    useElectronFileOpen(openFileFromOS, (path, error) => {
        logError(`Failed to open ${path}.`, error);
        toast.error(
            t("loadingAndSaving.electronOpenError", {
                name: getFileName(path)
            })
        );
    });

    // Sound banks open in new tabs, anything else is tried as audio for the open bank, or for
    // the last bank dropped with it. All the audio files are one undo step
    const handleDroppedFiles = async (files: File[]) => {
        const audioFiles = files.filter((file) => !isSoundBankFile(file));
        let target = activeSession;
        for (const file of files) {
            if (isSoundBankFile(file)) {
                target = (await openBankFile(file)) ?? target;
            }
        }
        if (audioFiles.length === 0) {
            return;
        }
        if (!target) {
            toast.error(t("loadingAndSaving.openBankForSamples"));
            return;
        }
        setAreSettingsShown(false);
        const session = target;
        await importSamples(audioFiles, session.document, (actions) => {
            const focus = session.history.do(actions);
            if (focus) {
                setSessionView(session.id, focus);
            }
        });
    };
    useFileDrop((files) => void handleDroppedFiles(files));

    const handleOpenFile = async () => {
        const file = await pickFile(ACCEPTED_SOUNDBANK_FORMATS);
        if (file) {
            await openBankFile(file);
        }
    };

    const handleCloseFile = () => {
        if (!activeSession) return;
        // The tab that closes should be the one on screen
        setAreSettingsShown(false);
        requestClose(activeSession);
    };

    const isEditorShown = activeSession !== undefined && !areSettingsShown;

    // Alt+Left and Right, and the mouse's side buttons, go back and forward between elements.
    // The page has no history of its own, so the browser would leave it instead, even where
    // the keys do nothing in the app (a field, a dialog, the settings)
    useEventListener(document, "keydown", (e) => {
        if (
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
        if (e.button === 3 || e.button === 4) {
            e.preventDefault();
        }
    });
    useEventListener(document, "mouseup", (e) => {
        if (e.button !== 3 && e.button !== 4) {
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

    useEventListener(document, "keydown", (e) => {
        if (
            !areSettingsShown ||
            e.defaultPrevented ||
            e.key !== "Escape" ||
            isInModal(e.target)
        ) {
            return;
        }
        e.preventDefault();
        closeSettings();
    });

    if (layout === "phone") {
        return (
            <PhoneShell
                bankTabs={bankTabs}
                areSettingsShown={areSettingsShown}
                onToggleSettings={toggleSettings}
                onCloseSettings={closeSettings}
                onOpenFile={() => void handleOpenFile()}
                onNewFile={() => void openBankFile()}
                onCloseFile={handleCloseFile}
            />
        );
    }

    return (
        <div className={`spessafont_main`}>
            <Toaster toastOptions={{ className: "toasts" }} />
            <MenuBar
                showMIDIPlayer={tabs.length > 0}
                onToggleSettings={toggleSettings}
                onOpenFile={() => void handleOpenFile()}
                onNewFile={() => void openBankFile()}
                onCloseFile={handleCloseFile}
                session={activeSession}
                onViewChange={setActiveView}
                onToggleKeyboard={() => setIsKeyboardShown((shown) => !shown)}
                isEditorCovered={areSettingsShown}
                isKeyboardShown={isKeyboardShown}
                toolsMenuSlotRef={setToolsMenuSlot}
            />
            <div className={"app_body"}>
                {/* Covered by the settings, nothing in here takes the focus or a click */}
                <div className={"app_covered"} inert={areSettingsShown}>
                    <TabList
                        activeId={activeSession?.id}
                        onSelect={activate}
                        onClose={requestClose}
                        tabs={tabs}
                    />
                    {activeSession && (
                        <ErrorBoundary
                            key={activeSession.id}
                            fallback={renderPartError}
                        >
                            <ToolsMenuSlotContext value={toolsMenuContext}>
                                <BankEditor
                                    session={activeSession}
                                    view={activeView}
                                    onViewChange={setActiveView}
                                    isCovered={areSettingsShown}
                                />
                            </ToolsMenuSlotContext>
                        </ErrorBoundary>
                    )}
                    {tabs.length === 0 && (
                        <Welcome
                            onOpenFile={() => void handleOpenFile()}
                            onNewFile={() => void openBankFile()}
                        />
                    )}
                </div>
                {areSettingsShown && (
                    <div className={"app_settings_layer"}>
                        <button
                            type={"button"}
                            className={"pretty_button app_settings_close"}
                            autoFocus={true}
                            onClick={closeSettings}
                            title={t("settingsLocale.closeSettings")}
                            aria-label={t("settingsLocale.closeSettings")}
                        >
                            &times;
                        </button>
                        <ErrorBoundary fallback={renderPartError}>
                            <Settings openSessions={tabs} />
                        </ErrorBoundary>
                    </div>
                )}
            </div>

            {isKeyboardShown && (
                <ErrorBoundary fallback={renderPartError}>
                    <KeyboardController
                        session={isEditorShown ? activeSession : undefined}
                        view={activeView}
                    />
                </ErrorBoundary>
            )}
        </div>
    );
}
