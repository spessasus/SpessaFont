import type {
    BasicInstrument,
    BasicPreset,
    BasicZone,
    Modulator
} from "spessasynth_core";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import "./modulator_edit.css";
import { useTranslation } from "react-i18next";
import { EditModulatorsAction } from "./edit_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";

interface ModulatorEditorProps {
    name: string;
    zone: BasicZone;
    linkedZone: BasicZone | undefined;
    onClose: () => void;
    element: BasicPreset | BasicInstrument;
    defaultModulators: readonly Modulator[];
}

export function ModulatorEditor({
    name,
    zone,
    onClose,
    element,
    linkedZone,
    defaultModulators
}: ModulatorEditorProps) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();

    const setModulators = (mods: Modulator[]) => {
        const actions = [new EditModulatorsAction(element, zone, mods)];
        // The stereo partner gets the same modulators
        if (linkedZone) {
            actions.push(new EditModulatorsAction(element, linkedZone, mods));
        }
        apply(actions);
    };

    return (
        <div className={"zone_modulators"}>
            <h2>
                {t("modulatorLocale.editingModulators", {
                    name
                })}
            </h2>
            <button
                type={"button"}
                onClick={onClose}
                className={"plain_button close"}
                aria-label={t("modulatorLocale.closeEditor")}
                title={t("modulatorLocale.closeEditor")}
            >
                &times;
            </button>
            <ModulatorList
                modulatorList={zone.modulators}
                setModulatorList={setModulators}
                defaultModulators={defaultModulators}
            />
        </div>
    );
}
