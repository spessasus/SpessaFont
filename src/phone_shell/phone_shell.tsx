import { useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import "./phone_shell.css";
import type { BankTabs } from "../tab_list/use_bank_tabs.ts";
import { TabList } from "../tab_list/tab_list.tsx";
import { Welcome } from "../welcome/welcome.tsx";
import { KeyboardController } from "../keyboard/keyboard_controller.tsx";
import { PhoneBankEditor } from "../bank_editor/phone_bank_editor.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { renderPartError } from "../error_boundary/render_part_error.tsx";
import { ToolsMenuSlotContext } from "../menu_bar/tools_menu_slot.ts";
import { Gear } from "../utils/icons/app_icons.tsx";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { BACK_LEVELS, hasBackBehindNavigator } from "./back_stack.ts";
import {
    getDrillDepth,
    INITIAL_PHONE_SHELL_STATE,
    phoneShellReducer
} from "./phone_shell_state.ts";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { PhoneSettingsLayer } from "./phone_settings_layer.tsx";

interface PhoneShellProps {
    bankTabs: BankTabs;
    areSettingsShown: boolean;
    onToggleSettings: () => void;
    /**
     * Closes the settings and gives the focus back to where it was.
     */
    onCloseSettings: () => void;
    onOpenFile: () => void;
    onNewFile: () => void;
    onCloseFile: () => void;
}

/**
 * The app on a phone (spec 4.1): the shown editor full width, the lists in a layer over it and
 * the keyboard in a drawer under it.
 */
export function PhoneShell({
    bankTabs,
    areSettingsShown,
    onToggleSettings,
    onCloseSettings,
    onOpenFile,
    onNewFile
}: PhoneShellProps) {
    const { t } = useTranslation();
    const {
        tabs,
        activeSession,
        activeView,
        requestClose,
        activate,
        setActiveView,
        goBack
    } = bankTabs;
    const [state, dispatch] = useReducer(
        phoneShellReducer,
        INITIAL_PHONE_SHELL_STATE
    );
    const shellContext = useMemo(() => ({ state, dispatch }), [state]);
    // The editor puts its tools menu here, see ToolsMenu
    const [toolsMenuSlot, setToolsMenuSlot] = useState<HTMLDivElement | null>(
        null
    );
    const toolsMenuContext = {
        node: toolsMenuSlot,
        onReveal: () => {
            if (areSettingsShown) {
                onCloseSettings();
            }
        }
    };

    // Picking an element is the next step in a bank that was just opened
    const activeId = activeSession?.id;
    const [lastActiveId, setLastActiveId] = useState(activeId);
    if (activeId !== lastActiveId) {
        setLastActiveId(activeId);
        if (activeId !== undefined) {
            dispatch({ type: "openNavigator" });
        }
    }

    const isEditorShown = activeSession !== undefined && !areSettingsShown;
    const drillDepth =
        activeId === undefined ? 0 : getDrillDepth(state, activeId);

    useBackHandler(areSettingsShown, BACK_LEVELS.settings, () => {
        onCloseSettings();
        return true;
    });
    useBackHandler(
        state.isNavigatorOpen,
        BACK_LEVELS.closeNavigator,
        (stack) => {
            if (!hasBackBehindNavigator(stack)) {
                return false;
            }
            dispatch({ type: "closeNavigator" });
            return true;
        }
    );
    // The lists are the parent of every editor
    useBackHandler(
        !state.isNavigatorOpen && activeSession !== undefined,
        BACK_LEVELS.openNavigator,
        () => {
            dispatch({ type: "openNavigator" });
            return true;
        }
    );
    useBackHandler(drillDepth > 0, BACK_LEVELS.drillDown, () => {
        if (activeId === undefined) {
            return false;
        }
        goBack();
        dispatch({ type: "drillBack", tabId: activeId });
        return true;
    });

    const isKeysShown = state.drawer === "keys";

    return (
        <PhoneShellContext value={shellContext}>
            <div className={"spessafont_main phone_shell"}>
                <Toaster
                    position={"bottom-center"}
                    toastOptions={{ className: "toasts" }}
                />
                <div className={"phone_upper"}>
                    <header
                        className={"phone_app_bar"}
                        inert={areSettingsShown}
                    >
                        {activeSession && (
                            <button
                                type={"button"}
                                className={"phone_app_bar_button"}
                                onClick={() =>
                                    dispatch({ type: "openNavigator" })
                                }
                            >
                                {t("phoneLocale.appBar.openLists")}
                            </button>
                        )}
                        <div className={"phone_app_bar_spacer"} />
                        <div
                            ref={setToolsMenuSlot}
                            className={"phone_app_bar_tools_slot"}
                        />
                        <button
                            type={"button"}
                            className={"phone_app_bar_button"}
                            aria-pressed={areSettingsShown}
                            onClick={onToggleSettings}
                            aria-label={t("settingsLocale.settings")}
                        >
                            <Gear />
                        </button>
                    </header>
                    {/* Covered by the settings, nothing in here takes the focus or a click */}
                    <div className={"phone_covered"} inert={areSettingsShown}>
                        {activeSession ? (
                            <ErrorBoundary
                                key={activeSession.id}
                                fallback={renderPartError}
                            >
                                <ToolsMenuSlotContext value={toolsMenuContext}>
                                    <PhoneBankEditor
                                        session={activeSession}
                                        view={activeView}
                                        onViewChange={setActiveView}
                                        isCovered={areSettingsShown}
                                        tabList={
                                            <TabList
                                                activeId={activeId}
                                                onSelect={activate}
                                                onClose={requestClose}
                                                tabs={tabs}
                                            />
                                        }
                                    />
                                </ToolsMenuSlotContext>
                            </ErrorBoundary>
                        ) : (
                            <Welcome
                                onOpenFile={onOpenFile}
                                onNewFile={onNewFile}
                            />
                        )}
                    </div>
                    {areSettingsShown && (
                        <PhoneSettingsLayer
                            openSessions={tabs}
                            onClose={onCloseSettings}
                        />
                    )}
                </div>
                {activeSession && (
                    <div className={"phone_drawer_placeholder"}>
                        <div className={"phone_drawer_handle"}>
                            <button
                                type={"button"}
                                className={"pretty_button phone_drawer_toggle"}
                                aria-pressed={isKeysShown}
                                onClick={() =>
                                    dispatch({
                                        type: "setDrawer",
                                        drawer: isKeysShown
                                            ? "collapsed"
                                            : "keys"
                                    })
                                }
                            >
                                {t("keyboard")}
                            </button>
                        </div>
                        {isKeysShown && (
                            <ErrorBoundary fallback={renderPartError}>
                                <KeyboardController
                                    session={
                                        isEditorShown
                                            ? activeSession
                                            : undefined
                                    }
                                    view={activeView}
                                />
                            </ErrorBoundary>
                        )}
                    </div>
                )}
            </div>
        </PhoneShellContext>
    );
}
