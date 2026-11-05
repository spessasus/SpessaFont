import {
    type BasicPreset,
    type MIDIPatch,
    MIDIPatchTools
} from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeletePresetAction } from "./delete_preset_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditPresetAction } from "./edit_preset_action.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { usePresetView } from "../../hooks/use_preset_view.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { useScopedToastDialog } from "../../hooks/use_scoped_toast_dialog.ts";
import {
    findFreePatch,
    getTakenPatches
} from "../../core_backend/free_patch.ts";
import { MAX_NAME_LENGTH } from "../../utils/element_name.ts";

interface BottomBarProps {
    /**
     * The edited preset, for the actions. What the bar shows comes from its view.
     */
    preset: BasicPreset;
}

export function BottomBar({ preset }: BottomBarProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const view = usePresetView(session.store, getObjectId(preset));
    const showScopedToastDialog = useScopedToastDialog();
    // The pane closes when its preset is removed, this only covers the render before
    if (!view) {
        return null;
    }

    const applyPatch = (patch: MIDIPatch) =>
        apply(
            (["program", "bankMSB", "bankLSB", "isGMGSDrum"] as const)
                .filter((key) => preset[key] !== patch[key])
                .map(
                    (key) =>
                        new EditPresetAction(
                            preset,
                            key,
                            preset[key],
                            patch[key]
                        )
                )
        );

    /**
     * Applies a patch change unless another preset already uses the resulting patch.
     * Then it offers the next free patch instead, and returns the preset that blocked it.
     * The offer checks again when taken, as the bank may have changed in the meantime.
     */
    const changePatch = (changes: Partial<MIDIPatch>) => {
        const { presets } = session.document;
        if (!presets.includes(preset)) {
            return undefined;
        }
        const patch: MIDIPatch = {
            program: preset.program,
            bankMSB: preset.bankMSB,
            bankLSB: preset.bankLSB,
            isGMGSDrum: preset.isGMGSDrum,
            ...changes
        };
        const duplicate = presets.find((p) => p !== preset && p.matches(patch));
        if (!duplicate) {
            applyPatch(patch);
            return undefined;
        }
        // Its own patch counts as taken, "Keep" already offers that
        const free = findFreePatch(patch, getTakenPatches(presets));
        showScopedToastDialog({
            content: t("presetLocale.patchTaken", {
                name: duplicate.name
            }),
            isError: true,
            buttons: free
                ? [
                      {
                          label: t("presetLocale.useFreePatch", {
                              patch: MIDIPatchTools.toMIDIString(free)
                          }),
                          onClick: () => {
                              changePatch(free);
                          }
                      },
                      { label: t("presetLocale.keepPatch") }
                  ]
                : [{ label: t("presetLocale.keepPatch") }]
        });
        return duplicate;
    };

    const setNumber = (key: "program" | "bankMSB" | "bankLSB") => {
        // A fraction never matches a program change and saves rounded down, so it is rounded here
        return (typed: number) => {
            const value = Math.round(typed);
            return changePatch({ [key]: value }) ? preset[key] : value;
        };
    };

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    className={"monospaced"}
                    type={"text"}
                    value={view.name}
                    aria-label={t("presetLocale.presetName")}
                    onCommit={(name) => {
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

            <label>
                <span>{t("presetLocale.bankLSB")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={view.bankLSB}
                    onCommit={setNumber("bankLSB")}
                />
            </label>
            <label>
                <span>{t("presetLocale.bankMSB")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={view.bankMSB}
                    onCommit={setNumber("bankMSB")}
                />
            </label>

            <label>
                <span>{t("presetLocale.programNumber")}</span>
                <WaitingInput
                    type={"number"}
                    min={0}
                    max={127}
                    value={view.program}
                    onCommit={setNumber("program")}
                />
            </label>
            <div className={"drums_toggle"}>
                <span>{t("presetLocale.drums")}</span>
                <ControllerSwitch
                    label={t("presetLocale.drums")}
                    value={view.isGMGSDrum}
                    // A melodic bank is not a drum kit map, so the switch starts on bank 0
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
