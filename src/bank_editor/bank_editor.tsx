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
import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    sampleTypes,
    type SampleTypeValue
} from "spessasynth_core";
import { PresetEditor } from "../preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "../instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "../sample_editor/sample_editor.tsx";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { SetSampleTypeAction } from "../sample_editor/set_sample_type_action.ts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export type BankEditorProps = {
    manager: SoundBankManager;
    audioEngine: AudioEngine;
    clipboardManager: ClipboardManager;
    destinationOptions: JSX.Element;
    ccOptions: JSX.Element;
    shown: boolean;
    ref: BankEditorRef;
    setEnabledKeys: (k: boolean[]) => unknown;
};

export type SetViewType = (v: BankEditView) => unknown;

export const MemoizedBankEditor = React.memo(BankEditor);

export type BankEditorRef = RefObject<{
    removeUnusedElements: () => void;
    autoLinkSamples: () => void;
} | null>;

export function BankEditor({
    manager,
    audioEngine,
    clipboardManager,
    destinationOptions,
    ccOptions,
    shown,
    ref,
    setEnabledKeys
}: BankEditorProps) {
    const { t } = useTranslation();
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
    useEffect(() => {
        if (
            !shown ||
            (!(view instanceof BasicInstrument) &&
                !(view instanceof BasicPreset))
        ) {
            setEnabledKeys(Array(128).fill(true));
        }
    }, [setEnabledKeys, shown, view]);

    useEffect(() => {
        return () => {
            setEnabledKeys(Array(128).fill(true));
        };
    }, [setEnabledKeys]);

    useImperativeHandle(ref, () => {
        return {
            removeUnusedElements: () => {
                // remove unused elements with history
                const deletedInstruments = new Set<BasicInstrument>();
                const instrumentActions: DeleteInstrumentAction[] =
                    manager.instruments.reduce(
                        (actions: DeleteInstrumentAction[], instrument) => {
                            if (instrument.useCount === 0) {
                                deletedInstruments.add(instrument);
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

                const sampleActions: DeleteSampleAction[] =
                    manager.samples.reduce(
                        (actions: DeleteSampleAction[], sample) => {
                            // determine the use count
                            let useCount = sample.useCount;
                            sample.linkedInstruments.forEach((i) => {
                                if (deletedInstruments.has(i)) {
                                    useCount--;
                                }
                            });
                            if (useCount === 0) {
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
                manager.modifyBank([...sampleActions, ...instrumentActions]);
                toast.success(
                    t("soundBankLocale.removedElements", {
                        instruments: instrumentActions.length,
                        samples: sampleActions.length
                    })
                );
            },

            // automatically link stereo samples based on the name
            autoLinkSamples: () => {
                const actions: SetSampleTypeAction[] = [];
                const linkedSamples = new Set<BasicSample>();
                samples.forEach((sample) => {
                    if (sample.linkedSample) {
                        return;
                    }

                    const match = sample.sampleName.match(
                        /[a-zA-Z!](?=\s*$|\)|$)/
                    )?.[0];
                    if (
                        match?.toLowerCase() !== "l" &&
                        match?.toLowerCase() !== "r"
                    ) {
                        return;
                    }
                    let replacement: string;
                    let type: SampleTypeValue;
                    switch (match) {
                        default:
                        case "l":
                            replacement = "r";
                            type = sampleTypes.leftSample;
                            break;

                        case "L":
                            replacement = "R";
                            type = sampleTypes.leftSample;
                            break;

                        case "r":
                            replacement = "l";
                            type = sampleTypes.rightSample;
                            break;

                        case "R":
                            replacement = "L";
                            type = sampleTypes.rightSample;
                            break;
                    }
                    const linkedName = sample.sampleName.replace(
                        /([a-zA-Z!])(?!.*[a-zA-Z!])/,
                        replacement
                    );
                    const linkedSample = samples.find(
                        (s) =>
                            s.sampleName === linkedName &&
                            !linkedSamples.has(s) &&
                            !s.linkedSample
                    );
                    if (linkedSample) {
                        linkedSamples.add(sample);
                        linkedSamples.add(linkedSample);
                        actions.push(
                            new SetSampleTypeAction(
                                sample,
                                undefined,
                                sample.sampleType,
                                linkedSample,
                                type,
                                () => {
                                    setSamples([...samples]);
                                }
                            )
                        );
                    }
                });
                if (actions.length > 0) {
                    toast.success(
                        t("soundBankLocale.modifiedSamples", {
                            count: actions.length
                        })
                    );
                    manager.modifyBank(actions);
                } else {
                    toast(t("soundBankLocale.noSamplesWereChanged"));
                }
            }
        };
    }, [manager, samples, setView, t]);

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
                        engine={audioEngine}
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
                        setEnabledKeys={setEnabledKeys}
                        clipboardManager={clipboardManager}
                        ccOptions={ccOptions}
                        destinationOptions={destinationOptions}
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
                        setEnabledKeys={setEnabledKeys}
                        clipboardManager={clipboardManager}
                        ccOptions={ccOptions}
                        destinationOptions={destinationOptions}
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
