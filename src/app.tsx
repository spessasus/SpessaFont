import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { DestinationsOptions } from "./utils/translated_options/destination_options.tsx";
import { ModulableControllerOptions } from "./utils/translated_options/modulable_controller_options.tsx";
import { BankEditor } from "./bank_editor/bank_editor.tsx";
import { ACCEPTED_SOUNDBANK_FORMATS } from "./utils/accepted_formats.ts";
import type { GenericRange } from "spessasynth_core";
import toast, { Toaster } from "react-hot-toast";
import "./toasts/toasts.css";
import { Welcome } from "./welcome/welcome.tsx";
import { logError, logInfo } from "./utils/core_utils.ts";
import { useAudioEngine } from "./core_backend/audio_engine_context.ts";
import { useMIDIAccess } from "./settings/midi_context/midi_context.ts";
import { useBankTabs } from "./tab_list/use_bank_tabs.ts";
import { useBankFileOpener } from "./hooks/use_bank_file_opener.ts";
import { useLaunchQueue } from "./hooks/use_launch_queue.ts";
import { useElectronFileOpen } from "./hooks/use_electron_file_open.ts";
import { useEventListener } from "./hooks/use_event_listener.ts";
import { pickFile } from "./utils/pick_file.ts";

export function App() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { selectedDevice } = useMIDIAccess();
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
    const [splits, setSplits] = useState<GenericRange[]>([]);

    // cached translated options
    // note: I can't use JSX here as it calls MCO 9 times for some reason?
    const ccOptions = useMemo(
        () => ModulableControllerOptions({ t: t, padLength: 5 }),
        [t]
    );
    const destinationOptions = useMemo(
        () => <>{DestinationsOptions({ t: t })}</>,
        [t]
    );

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
                name: path.split("/").at(-1) ?? path
            })
        );
    });

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

    const isWelcomeShown = tabs.length === 0 && !areSettingsShown;
    const isEditorShown = !isWelcomeShown && !areSettingsShown;

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
            />
            {areSettingsShown ? null : (
                <TabList
                    activeId={activeSession?.id}
                    onSelect={activate}
                    onClose={requestClose}
                    tabs={tabs}
                />
            )}

            {areSettingsShown && <Settings />}

            {activeSession && (
                <BankEditor
                    key={activeSession.id}
                    session={activeSession}
                    view={activeView}
                    setView={setActiveView}
                    shown={isEditorShown}
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                    setSplits={setSplits}
                />
            )}

            {isWelcomeShown && (
                <Welcome
                    onOpenFile={() => void handleOpenFile()}
                    onNewFile={() => void openBankFile()}
                />
            )}

            {isKeyboardShown && (
                <KeyboardController splits={splits} ccOptions={ccOptions} />
            )}
        </div>
    );
}
