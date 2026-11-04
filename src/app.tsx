import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { useTranslation } from "react-i18next";
import { useState } from "react";
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
import { useMIDIAccess } from "./settings/midi_context/midi_context.ts";
import { useBankTabs } from "./tab_list/use_bank_tabs.ts";
import { useBankFileOpener } from "./hooks/use_bank_file_opener.ts";
import { useLaunchQueue } from "./hooks/use_launch_queue.ts";
import { useElectronFileOpen } from "./hooks/use_electron_file_open.ts";
import { useEventListener } from "./hooks/use_event_listener.ts";
import { useUncaughtErrorToasts } from "./hooks/use_uncaught_error_toasts.ts";
import { pickFile } from "./utils/pick_file.ts";
import { getFileName } from "./utils/file_path.ts";
import { useFileDrop } from "./hooks/use_file_drop.ts";
import { createSampleImportActions } from "./menu_list/import_sample.ts";

const SOUND_BANK_EXTENSIONS = ACCEPTED_SOUNDBANK_FORMATS.split(",");

function isSoundBankFile(file: File) {
    const name = file.name.toLowerCase();
    return SOUND_BANK_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function App() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { selectedDevice } = useMIDIAccess();
    useUncaughtErrorToasts();
    const {
        tabs,
        activeSession,
        activeView,
        openSession,
        requestClose,
        activate,
        setActiveView
    } = useBankTabs();
    const openBankFile = useBankFileOpener(openSession);
    const [isKeyboardShown, setIsKeyboardShown] = useState(false);
    const [areSettingsShown, setAreSettingsShown] = useState(false);

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

    // Sound banks open in new tabs, anything else is tried as audio for the open bank
    const handleDroppedFiles = async (files: File[]) => {
        for (const file of files) {
            if (isSoundBankFile(file)) {
                await openBankFile(file);
                continue;
            }
            if (!activeSession) {
                toast.error(t("loadingAndSaving.openBankForSamples"));
                return;
            }
            try {
                const actions = await createSampleImportActions(
                    audioEngine.context,
                    file
                );
                const focus = activeSession.history.do(actions);
                if (focus) {
                    setActiveView(focus);
                }
            } catch (error) {
                logError(`Failed to import ${file.name}.`, error);
                toast.error(
                    t("loadingAndSaving.unsupportedFile", { name: file.name })
                );
            }
        }
    };
    useFileDrop((files) => void handleDroppedFiles(files));

    useEventListener(selectedDevice, "midimessage", (e) => {
        if (e.data) {
            audioEngine.processRealTime(e.data);
        }
    });

    const handleOpenFile = async () => {
        const file = await pickFile(ACCEPTED_SOUNDBANK_FORMATS);
        if (file) {
            await openBankFile(file);
        }
    };

    const isEditorShown = activeSession !== undefined && !areSettingsShown;

    return (
        <div className={`spessafont_main`}>
            <Toaster toastOptions={{ className: "toasts" }} />
            <MenuBar
                showMidiPlayer={tabs.length > 0}
                onToggleSettings={() => setAreSettingsShown((shown) => !shown)}
                onOpenFile={() => void handleOpenFile()}
                onNewFile={() => void openBankFile()}
                onCloseFile={() => {
                    if (activeSession) requestClose(activeSession);
                }}
                session={activeSession}
                setView={setActiveView}
                onToggleKeyboard={() => setIsKeyboardShown((shown) => !shown)}
                isEditorCovered={areSettingsShown}
            />
            <div className={"app_body"}>
                <TabList
                    activeId={activeSession?.id}
                    onSelect={activate}
                    onClose={requestClose}
                    tabs={tabs}
                />
                {activeSession && (
                    <BankEditor
                        key={activeSession.id}
                        session={activeSession}
                        view={activeView}
                        setView={setActiveView}
                        isCovered={areSettingsShown}
                    />
                )}
                {tabs.length === 0 && (
                    <Welcome
                        onOpenFile={() => void handleOpenFile()}
                        onNewFile={() => void openBankFile()}
                    />
                )}
                {areSettingsShown && (
                    <div className={"app_settings_layer"}>
                        <Settings />
                    </div>
                )}
            </div>

            {isKeyboardShown && (
                <KeyboardController
                    session={isEditorShown ? activeSession : undefined}
                    view={activeView}
                />
            )}
        </div>
    );
}
