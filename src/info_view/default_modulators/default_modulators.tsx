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
import {
    getLostSFeDefaultModulators,
    getMissingHiddenDefaults,
    getSF2DefaultModulators
} from "../../core_backend/sf2_default_modulators.ts";
import {
    getShownModulators,
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

    // What an edit of the default list sets, read when the user acts. A reset's copies of the
    // standard list are no SFe data the user brought in, the SF2 rules decide what stays
    const planDefaults = (all: Modulator[], isReset: boolean) => {
        const before = getModulators();
        // A paste of SFe data switches the bank to SFe mode, so the SF2 rules do not apply
        const isAddingSFeData =
            !isReset &&
            getLostSFeDefaultModulators(all).some((m) => !before.includes(m));
        // A bank that saves as DLS keeps its list, core's SF2 reader does not read it
        const isSF2Edit =
            !isSFe &&
            !isAddingSFeData &&
            session.document.writeFormat !== "dls";
        // SF2 mode drops the hidden defaults an SF2 file would not get back. The SFe switch
        // then puts the resonance twins of the instrument zones in step with the new list
        const modulators = isSF2Edit ? getSF2DefaultModulators(all) : all;
        return { before, isAddingSFeData, modulators };
    };

    const applyDefaults = (
        {
            before,
            isAddingSFeData,
            modulators
        }: ReturnType<typeof planDefaults>,
        mergeKey?: string
    ) =>
        applyWithSFeSwitch(
            session,
            [new SetDefaultModulatorsAction(before, modulators)],
            isAddingSFeData ? "sfeData" : undefined,
            (group) => apply(group, mergeKey)
        );

    const setDefaultModulators = (all: Modulator[], mergeKey?: string) =>
        applyDefaults(planDefaults(all, false), mergeKey);

    const resetDefaultModulators = () => {
        // Copies of core's standard list, which is frozen. The action swaps their custom
        // curves for the bank's own
        const standard = getShownModulators(
            SPESSASYNTH_DEFAULT_MODULATORS,
            isSFe
        ).map((m) => Modulator.copyFrom(m));
        const current = getModulators();
        // SF2 mode resets the shown ones, keeps the hidden SFe ones where they are and puts
        // back the hidden standard ones an earlier edit dropped
        const merged = mergeHiddenModulators(current, standard);
        const plan = planDefaults(
            isSFe ? standard : [...merged, ...getMissingHiddenDefaults(merged)],
            true
        );
        // Nothing to do when the SF2 rules give the same list back
        const isUnchanged =
            plan.modulators.length === current.length &&
            plan.modulators.every((mod, i) =>
                Modulator.isIdentical(mod, current[i], true)
            );
        if (!isUnchanged) {
            applyDefaults(plan);
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
