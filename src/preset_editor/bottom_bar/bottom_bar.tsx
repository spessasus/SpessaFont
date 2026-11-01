import type { BasicPreset } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditPresetAction } from "./edit_preset_action.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import toast from "react-hot-toast";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";

export function BottomPresetBar({ preset }: { preset: BasicPreset }) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const presets = useBankSnapshot(session.store, (s) => s.presets);

    const deletePreset = () => {
        apply([new DeletePresetAction(preset)]);
    };
    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    type={"text"}
                    value={preset.name}
                    setValue={(v) => {
                        apply([
                            new EditPresetAction(preset, "name", preset.name, v)
                        ]);
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
                                apply([
                                    new EditPresetAction(
                                        preset,
                                        "bankLSB",
                                        preset.bankLSB,
                                        v
                                    )
                                ]);
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
                                apply([
                                    new EditPresetAction(
                                        preset,
                                        "bankMSB",
                                        preset.bankMSB,
                                        v
                                    )
                                ]);
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
                        apply([
                            new EditPresetAction(
                                preset,
                                "program",
                                preset.program,
                                v
                            )
                        ]);
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
                        apply([
                            new EditPresetAction(
                                preset,
                                "isGMGSDrum",
                                preset.isGMGSDrum,
                                v
                            ),
                            new EditPresetAction(
                                preset,
                                "bankLSB",
                                preset.bankLSB,
                                0
                            ),
                            new EditPresetAction(
                                preset,
                                "bankMSB",
                                preset.bankMSB,
                                0
                            )
                        ]);
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
