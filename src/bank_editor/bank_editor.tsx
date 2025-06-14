import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { ClipBoardManager } from "../core_backend/clipboard_manager.ts";
import { SoundBankInfo } from "./info_view/sound_bank_info.tsx";
import * as React from "react";
import { type JSX, useCallback, useRef, useState } from "react";
import { MenuList, type MenuListRef } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { BasicInstrument, BasicPreset } from "spessasynth_core";
import { PresetEditor } from "./preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "./instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "./sample_editor/sample_editor.tsx";

export type BankEditorProps = {
    manager: SoundBankManager;
    audioEngine: AudioEngine;
    clipboardManager: ClipBoardManager;
    destinationOptions: JSX.Element;
    ccOptions: JSX.Element;
};

export type SetViewType = (v: BankEditView) => unknown;

export const MemoizedBankEditor = React.memo(
    ({
        manager,
        audioEngine,
        clipboardManager,
        destinationOptions,
        ccOptions,
        show
    }: BankEditorProps & { show: boolean }) => {
        if (!show) {
            return <></>;
        }
        return (
            <BankEditor
                audioEngine={audioEngine}
                ccOptions={ccOptions}
                clipboardManager={clipboardManager}
                destinationOptions={destinationOptions}
                manager={manager}
            />
        );
    }
);

export function BankEditor({
    manager,
    audioEngine,
    clipboardManager,
    destinationOptions,
    ccOptions
}: BankEditorProps) {
    const [view, setView] = useState<BankEditView>(manager.currentView);
    const [samples, setSamples] = useState(manager.bank.samples);
    const [instruments, setInstruments] = useState(manager.bank.instruments);
    const [presets, setPresets] = useState(manager.bank.presets);
    const menuRef = useRef<MenuListRef>(null);

    const updateView = useCallback(
        (v: BankEditView) => {
            manager.currentView = v;
            setView(v);
        },
        [manager]
    );

    const MainContent = React.memo(function () {
        if (view === "info") {
            return (
                <SoundBankInfo
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                    manager={manager}
                    clipboard={clipboardManager}
                ></SoundBankInfo>
            );
        }
        if (view instanceof BasicPreset) {
            return (
                <PresetEditor engine={audioEngine} preset={view}></PresetEditor>
            );
        }
        if (view instanceof BasicInstrument) {
            return (
                <InstrumentEditor
                    engine={audioEngine}
                    instrument={view}
                ></InstrumentEditor>
            );
        }
        return (
            <SampleEditor
                menuRef={menuRef}
                manager={manager}
                setView={updateView}
                engine={audioEngine}
                sample={view}
                setSamples={setSamples}
                samples={samples}
            ></SampleEditor>
        );
    });

    return (
        <div className={"main_content"}>
            <MenuList
                ref={menuRef}
                view={view}
                sv={updateView}
                manager={manager}
                engine={audioEngine}
                setPresets={setPresets}
                presets={presets}
                samples={samples}
                setSamples={setSamples}
                instruments={instruments}
                setInstruments={setInstruments}
            ></MenuList>
            <div className={"main_content_window"}>
                <MainContent></MainContent>
            </div>
        </div>
    );
}
