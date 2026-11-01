import type { Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import type { JSX } from "react";
import type { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";

export function DefaultModulatorList({
    clipboard,
    ccOptions,
    destinationOptions
}: {
    clipboard: ClipboardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
}) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.defaultModulators
    );
    const info = useBankSnapshot(session.store, (s) => s.info);

    const setDefaultModulators = (modulators: Modulator[]) => {
        apply([
            new SetDefaultModulatorsAction([...defaultModulators], modulators)
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
                destinationOptions={destinationOptions}
                ccOptions={ccOptions}
                clipboardManager={clipboard}
                modulatorList={defaultModulators}
                setModulatorList={setDefaultModulators}
                defaultModulators={[]} // can't override default modulators when editing default modulators
            />
        </div>
    );
}
