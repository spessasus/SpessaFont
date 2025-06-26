import type SoundBankManager from "../../../core_backend/sound_bank_manager.ts";
import { BasicPreset } from "spessasynth_core";
import "../../bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import type { SetViewType } from "../../bank_editor.tsx";
import { WaitingInput } from "../../../fancy_inputs/waiting_input/waiting_input.tsx";
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
        const mainIndex = presets.indexOf(preset);
        manager.modifyBank([
            new DeletePresetAction(mainIndex, setPresets, setView)
        ]);
    };
    return (
        <div className={"bottom_bar"}>
            <div onClick={deletePreset}>
                <b className={"warning"}>{t("presetLocale.deletePreset")}</b>
            </div>
            <div>
                <WaitingInput
                    type={"text"}
                    value={preset.presetName}
                    setValue={(v) => {
                        const action = new EditPresetAction(
                            presets.indexOf(preset),
                            "presetName",
                            preset.presetName,
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
        </div>
    );
}
