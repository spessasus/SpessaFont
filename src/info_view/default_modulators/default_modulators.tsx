import { BasicSoundBank, Modulator } from "spessasynth_core";
import { Trans, useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useLayout } from "../../layout/layout_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { OverviewPanelHeader } from "../overview_panel_header.tsx";

interface DefaultModulatorsProps {
    /**
     * Back to the overview, from the phone panel's bar.
     */
    onBack: () => void;
}

export function DefaultModulators({ onBack }: DefaultModulatorsProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { session, apply } = useBankEditor();
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.views.defaultModulators
    );
    // The bank's own list, read when an edit is applied
    const getModulators = () => session.document.bank.defaultModulators;
    const info = useBankSnapshot(session.store, (s) => s.info);

    const setDefaultModulators = (
        modulators: Modulator[],
        mergeKey?: string
    ) => {
        apply(
            [new SetDefaultModulatorsAction([...getModulators()], modulators)],
            mergeKey
        );
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

    const titleText = (
        <Trans
            i18nKey={"bankInfo.defaultModulatorsForBank"}
            values={{
                name: info.name.length > 0 ? info.name : t("bankInfo.unnamed")
            }}
            components={{ bank: <i /> }}
        />
    );

    return (
        <div className={"default_modulators"}>
            {layout === "phone" ? null : (
                <h2 className={"default_modulators_title"}>{titleText}</h2>
            )}
            <ModulatorList
                modulatorList={defaultModulators}
                getModulators={getModulators}
                onModulatorListChange={setDefaultModulators}
                renderHeader={
                    layout === "phone"
                        ? (newButton) => (
                              <OverviewPanelHeader
                                  onBack={onBack}
                                  // The app bar already names the bank
                                  title={t(
                                      "phoneLocale.overview.defaultModulators"
                                  )}
                              >
                                  {newButton}
                              </OverviewPanelHeader>
                          )
                        : undefined
                }
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
