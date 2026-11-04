import type { Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";

export function DefaultModulatorList() {
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

    return (
        <div className={"default_modulators"}>
            <h2 className={"default_modulators_title"}>
                {t("bankInfo.defaultModulatorsFor")}{" "}
                <i>
                    {info.name.length > 0 ? info.name : t("bankInfo.unnamed")}
                </i>
                :
            </h2>
            <ModulatorList
                modulatorList={defaultModulators}
                getModulators={getModulators}
                setModulatorList={setDefaultModulators}
                defaultModulators={[]} // can't override default modulators when editing default modulators
            />
        </div>
    );
}
