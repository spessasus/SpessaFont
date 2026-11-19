import { Modulator, SPESSASYNTH_DEFAULT_MODULATORS } from "spessasynth_core";
import { Trans, useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { SetDefaultModulatorsAction } from "./set_default_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useLayout } from "../../layout/layout_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { OverviewPanelHeader } from "../overview_panel_header.tsx";
import { useSFeSwitch } from "../../hooks/use_sfe_switch.ts";
import { useCustomCurves } from "../../hooks/use_custom_curves.ts";
import { syncResonanceCompensators } from "../../core_backend/resonance_compensation.ts";
import {
    getShownModulators,
    isLostSFeDefaultModulator,
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
    const isSFe = useBankSnapshot(session.store, (s) => s.format === "sfe");
    const applyWithSFeSwitch = useSFeSwitch();
    const { customCurves, getCustomCurve } = useCustomCurves(session);

    const setDefaultModulators = (shown: Modulator[], mergeKey?: string) => {
        const before = getModulators();
        // SF2 mode hides the CC 71 to gain twins, which follow the shown modulators
        const modulators = isSFe
            ? shown
            : syncResonanceCompensators(shown, false);
        applyWithSFeSwitch(
            session,
            [new SetDefaultModulatorsAction(before, modulators)],
            modulators.some(
                (m) => isLostSFeDefaultModulator(m) && !before.includes(m)
            ),
            (group) => apply(group, mergeKey)
        );
    };

    const resetDefaultModulators = () => {
        // Copies of core's standard list, which is frozen. The action swaps their custom
        // curves for the bank's own
        const standard = getShownModulators(
            SPESSASYNTH_DEFAULT_MODULATORS,
            isSFe
        ).map((m) => Modulator.copyFrom(m));
        const current = getModulators();
        // SF2 mode resets the shown ones and keeps the hidden SFe ones where they are
        const shown = getShownModulators(current, isSFe);
        const isStandard =
            shown.length === standard.length &&
            shown.every((mod, i) =>
                Modulator.isIdentical(mod, standard[i], true)
            );
        if (!isStandard) {
            setDefaultModulators(
                isSFe ? standard : mergeHiddenModulators(current, standard)
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
                isSFe={isSFe}
                customCurves={customCurves}
                getCustomCurve={getCustomCurve}
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
