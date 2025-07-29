import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import { BasicPreset } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditPresetAction } from "./edit_preset_action.ts";

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

            <div>
                <span>{t("presetLocale.programNumber")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={preset.program}
                    setValue={(v) => {
                        // no duplicates
                        if (
                            presets.find(
                                (p) => p.program === v && p.bank === preset.bank
                            )
                        ) {
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
            <div>
                <span>{t("presetLocale.bankNumber")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={128}
                    value={preset.bank}
                    setValue={(v) => {
                        // no duplicates
                        if (
                            presets.find(
                                (p) =>
                                    p.program === preset.program && p.bank === v
                            )
                        ) {
                            return preset.bank;
                        }
                        const action = new EditPresetAction(
                            presets.indexOf(preset),
                            "bank",
                            preset.bank,
                            v,
                            () => setPresets([...presets])
                        );
                        manager.modifyBank([action]);
                        return v;
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
