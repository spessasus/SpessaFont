import { BasicSoundBank, Modulator } from "spessasynth_core";
import { Trans, useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";

export function DefaultModulators() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.views.defaultModulators
    );
    // The bank's own list, read when an edit is applied
    const getModulators = () => session.document.bank.defaultModulators;
    const info = useBankSnapshot(session.store, (s) => s.info);

    const setDefaultModulators = (modulators: Modulator[]) => {
        apply([
            new SetDefaultModulatorsAction([...getModulators()], modulators)
        ]);
    };

    const resetDefaultModulators = () => {
        // A new bank starts with core's standard list, as fresh copies
        const standard = new BasicSoundBank().defaultModulators;
        const current = getModulators();
        const isStandard =
            current.length === standard.length &&
            current.every((mod, i) =>
                Modulator.isIdentical(mod, standard[i], true)
            );
        if (!isStandard) {
            setDefaultModulators(standard);
        }
    };

    return (
        <div className={"default_modulators"}>
            <h2 className={"default_modulators_title"}>
                <Trans
                    i18nKey={"bankInfo.defaultModulatorsForBank"}
                    values={{
                        name:
                            info.name.length > 0
                                ? info.name
                                : t("bankInfo.unnamed")
                    }}
                    components={{ bank: <i /> }}
                />
            </h2>
            <p className={"default_modulators_note"}>
                {t("bankInfo.defaultModulatorsNote")}
            </p>
            <ModulatorList
                modulatorList={defaultModulators}
                getModulators={getModulators}
                onModulatorListChange={setDefaultModulators}
                defaultModulators={[]} // can't override default modulators when editing default modulators
                extraActions={
                    <button
                        type={"button"}
                        onClick={resetDefaultModulators}
                        className={
                            "modulator_main modulator_list_button hover_brightness"
                        }
                    >
                        {t("bankInfo.resetDefaultModulators")}
                    </button>
                }
            />
        </div>
    );
}
