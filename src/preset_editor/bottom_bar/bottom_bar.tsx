import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import { BasicPreset } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditPresetAction } from "./edit_preset_action.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import toast from "react-hot-toast";

export function BottomPresetBar({
    manager,
    setPresets,
    preset,
    presets,
    setView
}: {
    manager: SoundBankManager;
    setPresets: (p: BasicPreset[]) => unknown;
    presets: BasicPreset[];
    preset: BasicPreset;
    setView: SetViewType;
}) {
    const { t } = useTranslation();

    const deletePreset = () => {
        manager.modifyBank([
            new DeletePresetAction(preset, setPresets, setView)
        ]);
    };
    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    type={"text"}
                    value={preset.name}
                    setValue={(v) => {
                        const action = new EditPresetAction(
                            presets.indexOf(preset),
                            "name",
                            preset.name,
                            v,
                            () => setPresets([...presets])
                        );
                        manager.modifyBank([action]);
                        return v;
                    }}
                    maxLength={40}
                />
            </div>

            {!preset.isGMGSDrum && (
                <>
                    <div>
                        <span>{t("presetLocale.bankLSB")}</span>
                        <WaitingInput
                            type={"number"}
                            min={0}
                            max={128}
                            value={preset.bankLSB}
                            setValue={(v) => {
                                const checker = {
                                    ...preset,
                                    bankLSB: v
                                };
                                // no duplicates
                                const duplicate = presets.find((p) =>
                                    p.matches(checker)
                                );
                                if (duplicate) {
                                    toast.error(
                                        `${t("presetLocale.presetWithTheParametersExists")} (${duplicate.name}) `
                                    );
                                    return preset.bankLSB;
                                }
                                const action = new EditPresetAction(
                                    presets.indexOf(preset),
                                    "bankLSB",
                                    preset.bankLSB,
                                    v,
                                    () => setPresets([...presets])
                                );
                                manager.modifyBank([action]);
                                return v;
                            }}
                        />
                    </div>
                    <div>
                        <span>{t("presetLocale.bankMSB")}</span>
                        <WaitingInput
                            type={"number"}
                            min={0}
                            max={128}
                            value={preset.bankMSB}
                            setValue={(v) => {
                                const checker = {
                                    ...preset,
                                    bankMSB: v
                                };
                                // no duplicates
                                const duplicate = presets.find((p) =>
                                    p.matches(checker)
                                );
                                if (duplicate) {
                                    toast.error(
                                        `${t("presetLocale.presetWithTheParametersExists")} (${duplicate.name}) `
                                    );
                                    return preset.bankMSB;
                                }
                                const action = new EditPresetAction(
                                    presets.indexOf(preset),
                                    "bankMSB",
                                    preset.bankMSB,
                                    v,
                                    () => setPresets([...presets])
                                );
                                manager.modifyBank([action]);
                                return v;
                            }}
                        />
                    </div>
                </>
            )}

            <div>
                <span>{t("presetLocale.programNumber")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={preset.program}
                    setValue={(v) => {
                        const checker = {
                            ...preset,
                            program: v
                        };
                        // no duplicates
                        const duplicate = presets.find((p) =>
                            p.matches(checker)
                        );
                        if (duplicate) {
                            toast.error(
                                `${t("presetLocale.presetWithTheParametersExists")} (${duplicate.name}) `
                            );
                            return preset.program;
                        }
                        const action = new EditPresetAction(
                            presets.indexOf(preset),
                            "program",
                            preset.program,
                            v,
                            () => setPresets([...presets])
                        );
                        manager.modifyBank([action]);
                        return v;
                    }}
                />
            </div>
            <div className={"drums_toggle"}>
                <span>{t("presetLocale.drums")}</span>
                <ControllerSwitch
                    value={preset.isGMGSDrum}
                    onChange={(v) => {
                        const checker = {
                            ...preset,
                            isGMGSDrum: v
                        };
                        // no duplicates
                        const duplicate = presets.find((p) =>
                            p.matches(checker)
                        );
                        if (duplicate) {
                            toast.error(
                                `${t("presetLocale.presetWithTheParametersExists")} (${duplicate.name}) `
                            );
                            return;
                        }
                        // Set banks to 0
                        const actions = [
                            new EditPresetAction(
                                presets.indexOf(preset),
                                "isGMGSDrum",
                                preset.isGMGSDrum,
                                v,
                                () => void 0
                            ),
                            new EditPresetAction(
                                presets.indexOf(preset),
                                "bankLSB",
                                preset.bankLSB,
                                0,
                                () => void 0
                            ),
                            new EditPresetAction(
                                presets.indexOf(preset),
                                "bankMSB",
                                preset.bankMSB,
                                0,
                                () => setPresets([...presets])
                            )
                        ];
                        manager.modifyBank(actions);
                    }}
                />
            </div>
            <div onClick={deletePreset}>
                <strong className={"warning"}>
                    {t("presetLocale.deletePreset")}
                </strong>
            </div>
        </div>
    );
}
