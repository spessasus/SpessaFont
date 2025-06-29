import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import * as React from "react";
import {
    type JSX,
    type RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState
} from "react";
import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import { PresetEditor } from "../preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "../instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "../sample_editor/sample_editor.tsx";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";

export type BankEditorProps = {
    manager: SoundBankManager;
    audioEngine: AudioEngine;
    clipboardManager: ClipboardManager;
    destinationOptions: JSX.Element;
    ccOptions: JSX.Element;
    shown: boolean;
    ref: BankEditorRef;
};

export type SetViewType = (v: BankEditView) => unknown;

export const MemoizedBankEditor = React.memo(BankEditor);

export type BankEditorRef = RefObject<{
    removeUnusedElements: () => void;
} | null>;

export function BankEditor({
    manager,
    audioEngine,
    clipboardManager,
    destinationOptions,
    ccOptions,
    shown,
    ref
}: BankEditorProps) {
    const [view, setViewLocal] = useState<BankEditView>(manager.currentView);
    const [samples, setSamples] = useState(manager.samples);
    const [instruments, setInstruments] = useState(manager.instruments);
    const [presets, setPresets] = useState(manager.presets);

    const setView = useCallback(
        (v: BankEditView) => {
            manager.currentView = v;
            setViewLocal(v);
        },
        [manager]
    );

    useEffect(() => {
        setSamples(manager.samples);
        setInstruments(manager.instruments);
        setPresets(manager.presets);
        setView(manager.currentView);
    }, [manager, setView]);

    useImperativeHandle(ref, () => {
        return {
            removeUnusedElements: () => {
                console.log("REMOVING");
                // remove unused elements with history
                // samples
                const sampleActions: DeleteSampleAction[] =
                    manager.samples.reduce(
                        (actions: DeleteSampleAction[], sample) => {
                            if (sample.useCount === 0) {
                                console.log(sample.sampleName);
                                actions.push(
                                    new DeleteSampleAction(
                                        sample,
                                        setSamples,
                                        setView
                                    )
                                );
                            }
                            return actions;
                        },
                        []
                    );
                const instrumentActions: DeleteInstrumentAction[] =
                    manager.instruments.reduce(
                        (actions: DeleteInstrumentAction[], instrument) => {
                            if (instrument.useCount === 0) {
                                actions.push(
                                    new DeleteInstrumentAction(
                                        instrument,
                                        setInstruments,
                                        setView
                                    )
                                );
                            }
                            return actions;
                        },
                        []
                    );
                manager.modifyBank([...sampleActions, ...instrumentActions]);
            }
        };
    }, [manager, setView]);

    return (
        <div className={"main_content" + (shown ? "" : " hidden")}>
            <MenuList
                view={view}
                sv={setView}
                manager={manager}
                engine={audioEngine}
                setPresets={setPresets}
                presets={presets}
                samples={samples}
                setSamples={setSamples}
                instruments={instruments}
                setInstruments={setInstruments}
                clipboard={clipboardManager}
            ></MenuList>
            <div className={"main_content_window"}>
                {view === "info" && (
                    <SoundBankInfo
                        destinationOptions={destinationOptions}
                        ccOptions={ccOptions}
                        manager={manager}
                        clipboard={clipboardManager}
                    ></SoundBankInfo>
                )}
                {view instanceof BasicPreset && (
                    <PresetEditor
                        manager={manager}
                        engine={audioEngine}
                        preset={view}
                        setView={setView}
                        presets={presets}
                        setPresets={setPresets}
                    ></PresetEditor>
                )}
                {view instanceof BasicInstrument && (
                    <InstrumentEditor
                        engine={audioEngine}
                        instrument={view}
                        manager={manager}
                        setView={setView}
                        setInstruments={setInstruments}
                        instruments={instruments}
                    ></InstrumentEditor>
                )}
                {view instanceof BasicSample && (
                    <SampleEditor
                        manager={manager}
                        setView={setView}
                        engine={audioEngine}
                        sample={view}
                        setSamples={setSamples}
                        samples={samples}
                    ></SampleEditor>
                )}
            </div>
        </div>
    );
}
