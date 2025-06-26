import type SoundBankManager from "../../../core_backend/sound_bank_manager.ts";
import { BasicPreset } from "spessasynth_core";
import "../../bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import type { SetViewType } from "../../bank_editor.tsx";

export function BottomPresetBar({
    manager,
    setPresets,
    preset,
    setView
}: {
    manager: SoundBankManager;
    setPresets: (p: BasicPreset[]) => unknown;
    preset: BasicPreset;
    setView: SetViewType;
}) {
    const { t } = useTranslation();

    const deletePreset = () => {
        const mainIndex = manager.bank.presets.indexOf(preset);
        manager.modifyBank([
            new DeletePresetAction(mainIndex, setPresets, setView)
        ]);
    };
    return (
        <div className={"bottom_bar"}>
            <div onClick={deletePreset}>
                <b style={{ color: "red" }}>{t("presetLocale.deletePreset")}</b>
            </div>
        </div>
    );
}
