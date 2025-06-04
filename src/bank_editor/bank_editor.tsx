import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { ClipBoardManager } from "../core_backend/clipboard_manager.ts";
import { MainContentStates } from "../main_content_states.ts";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { useState } from "react";
import { PresetList } from "../preset_list/preset_list.tsx";
import "./bank_editor.css";

type BankEditorProps = {
    manager: SoundBankManager;
    audioEngine: AudioEngine;
    clipboardManager: ClipBoardManager;
};

export function BankEditor({
    manager,
    audioEngine,
    clipboardManager
}: BankEditorProps) {
    const [contentState, setContentState] = useState(MainContentStates.stats);

    function MainContent() {
        switch (contentState) {
            default:
                return <div>ERROR</div>;

            case MainContentStates.stats:
                return (
                    <SoundBankInfo
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
