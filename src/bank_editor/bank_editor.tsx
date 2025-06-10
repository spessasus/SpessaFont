import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { ClipBoardManager } from "../core_backend/clipboard_manager.ts";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { type JSX, useState } from "react";
import { PresetList } from "../preset_list/preset_list.tsx";
import "./bank_editor.css";

type BankEditorProps = {
    manager: SoundBankManager;
    audioEngine: AudioEngine;
    clipboardManager: ClipBoardManager;
    destinationOptions: JSX.Element;
    ccOptions: JSX.Element;
};

export function BankEditor({
    manager,
    audioEngine,
    clipboardManager,
    destinationOptions,
    ccOptions
}: BankEditorProps) {
    const [view, setView] = useState<BankEditView>(manager.currentView);

    const updateView = (v: BankEditView) => {
        manager.currentView = v;
        setView(v);
    };

    function MainContent() {
        switch (view) {
            default:
                return <div>ERROR</div>;

            case "info":
                return (
                    <SoundBankInfo
                        destinationOptions={destinationOptions}
                        ccOptions={ccOptions}
                        manager={manager}
                        clipboard={clipboardManager}
                    ></SoundBankInfo>
                );
        }
    }

    return (
        <div className={"main_content"}>
            <PresetList manager={manager}></PresetList>
            <div className={"main_content_window"}>
                <MainContent></MainContent>
            </div>
        </div>
    );
}
