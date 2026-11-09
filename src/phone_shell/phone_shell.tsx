import { useLayoutEffect, useMemo, useReducer, useState } from "react";
import { Toaster } from "react-hot-toast";
import "./phone_shell.css";
import "../toasts/toasts_phone.css";
import type { BankTabs } from "../tab_list/use_bank_tabs.ts";
import { TabList } from "../tab_list/tab_list.tsx";
import { Welcome } from "../welcome/welcome.tsx";
import { PhoneBankEditor } from "../bank_editor/phone_bank_editor.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { renderPartError } from "../error_boundary/render_part_error.tsx";
import { ToolsMenuSlotContext } from "../menu_bar/tools_menu_slot.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { BACK_LEVELS, hasBackBehindNavigator } from "./back_stack.ts";
import {
    getDrillDepth,
    getNavigatorPresence,
    getOpenNavigatorAction,
    INITIAL_PHONE_SHELL_STATE,
    phoneShellReducer
} from "./phone_shell_state.ts";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { PhoneAppBar } from "./phone_app_bar.tsx";
import { OverflowSheet } from "./overflow_sheet.tsx";
import { getDrillTo } from "./drill_to.ts";
import { PhoneSettingsLayer } from "./phone_settings_layer.tsx";
import { KeyboardDrawer } from "./keyboard_drawer.tsx";
import { getDrawerOffset } from "./drawer_offset.ts";
import { useBankCommands } from "../menu_bar/use_bank_commands.ts";
import { useBankShortcutKeys } from "../hooks/use_bank_shortcut_keys.ts";
import { useLeaveFlow } from "./use_leave_flow.ts";
import { useInstallPrompt } from "../hooks/use_install_prompt.ts";
import { logError } from "../utils/core_utils.ts";
import { useIsLandscape } from "../layout/use_is_landscape.ts";
import { applyOrientation } from "../layout/orientation.ts";

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
    onNewFile,
    onCloseFile
}: PhoneShellProps) {
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
    const isLandscape = useIsLandscape();
    // Before paint, so a rotation never paints a frame with the other orientation's sizes
    useLayoutEffect(() => {
        applyOrientation(isLandscape);
        return () => applyOrientation(undefined);
    }, [isLandscape]);
    const shellContext = useMemo(
        () => ({
            state,
            dispatch,
            presence: getNavigatorPresence(state, isLandscape),
            isLandscape
        }),
        [state, isLandscape]
    );
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

    const drillDepth =
        activeId === undefined ? 0 : getDrillDepth(state, activeId);

    useBackHandler(areSettingsShown, BACK_LEVELS.settings, () => {
        onCloseSettings();
        return true;
    });
    const { presence } = shellContext;
    // The docked navigator covers nothing, so back passes it by
    useBackHandler(
        presence.isCoveringEditor,
        BACK_LEVELS.closeNavigator,
        (stack) => {
            if (!hasBackBehindNavigator(stack)) {
                return false;
            }
            dispatch({ type: "closeNavigator" });
            return true;
        }
    );
    // The lists are the parent of every editor. A shown dock passes, so the next press leaves
    const openNavigatorAction = getOpenNavigatorAction(state, isLandscape);
    useBackHandler(
        openNavigatorAction !== undefined && activeSession !== undefined,
        BACK_LEVELS.openNavigator,
        () => {
            if (openNavigatorAction === undefined) {
                return false;
            }
            dispatch(openNavigatorAction);
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
    useLeaveFlow(tabs);

    // The same view change as the app bar's undo and redo buttons
    const showView = activeSession
        ? getDrillTo(activeSession.id, activeView, setActiveView, dispatch)
        : setActiveView;
    const commands = useBankCommands(activeSession, showView);
    useBankShortcutKeys(
        activeSession !== undefined,
        commands,
        areSettingsShown
    );

    // One listener, as the browser fires its offer once
    const install = useInstallPrompt();
    const showInstallPrompt = async () => {
        try {
            await install?.();
        } catch (error) {
            logError("Failed to show the install prompt.", error);
        }
    };
    const handleInstallApp = install
        ? () => void showInstallPrompt()
        : undefined;

    const drawerOffset = getDrawerOffset(state.drawer, isLandscape);

    return (
        <PhoneShellContext value={shellContext}>
            <div
                className={"spessafont_main phone_shell"}
                style={{ "--phone-drawer-offset": drawerOffset }}
                data-dock={
                    isLandscape && activeSession
                        ? presence.isShown
                            ? "expanded"
                            : "collapsed"
                        : undefined
                }
            >
                <Toaster
                    position={"bottom-center"}
                    containerStyle={{
                        bottom: "calc(var(--phone-drawer-offset) + 1rem)"
                    }}
                    toastOptions={{ className: "toasts" }}
                />
                <div className={"phone_upper"}>
                    <PhoneAppBar
                        session={activeSession}
                        view={activeView}
                        onViewChange={showView}
                        toolsSlotRef={setToolsMenuSlot}
                        isCovered={
                            areSettingsShown ||
                            (activeSession !== undefined &&
                                presence.isCoveringEditor)
                        }
                        overflow={
                            <OverflowSheet
                                session={activeSession}
                                bankTabs={bankTabs}
                                onOpenFile={onOpenFile}
                                onNewFile={onNewFile}
                                onCloseFile={onCloseFile}
                                onToggleSettings={onToggleSettings}
                                onInstallApp={handleInstallApp}
                                onViewChange={setActiveView}
                            />
                        }
                    />
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
                                        onOpenFile={onOpenFile}
                                        onNewFile={onNewFile}
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
                                onInstallApp={handleInstallApp}
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
                    <ErrorBoundary fallback={renderPartError}>
                        <KeyboardDrawer
                            session={activeSession}
                            view={activeView}
                            isCovered={areSettingsShown}
                        />
                    </ErrorBoundary>
                )}
            </div>
        </PhoneShellContext>
    );
}
