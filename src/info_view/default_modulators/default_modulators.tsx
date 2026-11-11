import { BasicSoundBank, Modulator } from "spessasynth_core";
import { Trans, useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useLayout } from "../../layout/layout_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { OverviewPanelHeader } from "../overview_panel_header.tsx";
import { useSFESwitch } from "../../hooks/use_sfe_switch.ts";
import {
    getShownModulators,
    isSFEGenerator,
    mergeHiddenModulators
} from "../../core_backend/sfe_data.ts";

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
    const isSFE = useBankSnapshot(session.store, (s) => s.format === "sfe");
    const applyWithSFESwitch = useSFESwitch();

    const setDefaultModulators = (
        modulators: Modulator[],
        mergeKey?: string
    ) => {
        const before = getModulators();
        applyWithSFESwitch(
            session,
            [new SetDefaultModulatorsAction([...before], modulators)],
            modulators.some(
                (m) => isSFEGenerator(m.destination) && !before.includes(m)
            ),
            (group) => apply(group, mergeKey)
        );
    };

    const resetDefaultModulators = () => {
        // A new bank starts with core's standard list, as fresh copies
        const standard = new BasicSoundBank().defaultModulators;
        const current = getModulators();
        // SF2 mode resets the shown ones and keeps the hidden SFE ones where they are
        const shown = getShownModulators(current, isSFE);
        const isStandard =
            shown.length === standard.length &&
            shown.every((mod, i) =>
                Modulator.isIdentical(mod, standard[i], true)
            );
        if (!isStandard) {
            setDefaultModulators(
                isSFE ? standard : mergeHiddenModulators(current, standard)
            );
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
                isSFE={isSFE}
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
