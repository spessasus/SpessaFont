import type { BasicPreset, MIDIPatch } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DeletePresetAction } from "./delete_preset_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditPresetAction } from "./edit_preset_action.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";

const MAX_NAME_LENGTH = 40;

interface BottomPresetBarProps {
    preset: BasicPreset;
}

export function BottomPresetBar({ preset }: BottomPresetBarProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const presets = useBankSnapshot(session.store, (s) => s.presets);

    /**
     * Applies a patch change unless another preset already uses the resulting patch.
     * Returns the preset that blocked the change, if any.
     */
    const changePatch = (changes: Partial<MIDIPatch>) => {
        const patch: MIDIPatch = {
            program: preset.program,
            bankMSB: preset.bankMSB,
            bankLSB: preset.bankLSB,
            isGMGSDrum: preset.isGMGSDrum,
            ...changes
        };
        const duplicate = presets.find((p) => p !== preset && p.matches(patch));
        if (duplicate) {
            toast.error(
                `${t("presetLocale.presetWithTheParametersExists")} (${duplicate.name})`
            );
            return duplicate;
        }
        apply(
            (Object.keys(changes) as (keyof MIDIPatch)[]).map(
                (key) =>
                    new EditPresetAction(preset, key, preset[key], patch[key])
            )
        );
        return undefined;
    };

    const setNumber = (key: "program" | "bankMSB" | "bankLSB") => {
        return (value: number) =>
            changePatch({ [key]: value }) ? preset[key] : value;
    };

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    type={"text"}
                    value={preset.name}
                    aria-label={t("presetLocale.presetName")}
                    setValue={(name) => {
                        apply([
                            new EditPresetAction(
                                preset,
                                "name",
                                preset.name,
                                name
                            )
                        ]);
                        return name;
                    }}
                    maxLength={MAX_NAME_LENGTH}
                />
            </div>

            {preset.isGMGSDrum ? null : (
                <>
                    <label>
                        <span>{t("presetLocale.bankLSB")}</span>
                        <WaitingInput
                            type={"number"}
                            min={0}
                            max={127}
                            value={preset.bankLSB}
                            setValue={setNumber("bankLSB")}
                        />
                    </label>
                    <label>
                        <span>{t("presetLocale.bankMSB")}</span>
                        <WaitingInput
                            type={"number"}
                            min={0}
                            max={127}
                            value={preset.bankMSB}
                            setValue={setNumber("bankMSB")}
                        />
                    </label>
                </>
            )}

            <label>
                <span>{t("presetLocale.programNumber")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={preset.program}
                    setValue={setNumber("program")}
                />
            </label>
            <div className={"drums_toggle"}>
                <span>{t("presetLocale.drums")}</span>
                <ControllerSwitch
                    value={preset.isGMGSDrum}
                    // Drum presets have no bank numbers
                    onChange={(isGMGSDrum) =>
                        changePatch({ isGMGSDrum, bankLSB: 0, bankMSB: 0 })
                    }
                />
            </div>
            <button
                type={"button"}
                className={"plain_button"}
                onClick={() => apply([new DeletePresetAction(preset)])}
            >
                <strong className={"warning"}>
                    {t("presetLocale.deletePreset")}
                </strong>
            </button>
        </div>
    );
}
