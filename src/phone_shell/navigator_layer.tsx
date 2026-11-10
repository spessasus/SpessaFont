import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { BasicSample } from "spessasynth_core";
import "./navigator_layer.css";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import {
    BankEditorContext,
    useBankEditor
} from "../bank_editor/bank_editor_context.ts";
import { MenuList } from "../menu_list/menu_list.tsx";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import {
    ChevronRightIcon,
    PinIcon,
    PlusIcon,
    SidebarCollapseIcon,
    SidebarExpandIcon
} from "../utils/icons/app_icons.tsx";
import { InfoIcon } from "../utils/icons/file_icons.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";
import { PhoneLayerHeader } from "./phone_layer_header.tsx";

interface NavigatorLayerProps {
    view: BankEditView;
    /**
     * The open banks, shown under the header.
     */
    tabList: ReactNode;
    /**
     * Whether the settings cover the editor, which turns the list shortcuts off.
     */
    isCovered: boolean;
    /**
     * Selects an element in the tab without touching the drill depth.
     */
    onViewChange: (view: BankEditView) => void;
    /**
     * Plays the shown sample from the start.
     */
    onPlay: () => void;
    onOpenFile: () => void;
    onNewFile: () => void;
}

/**
 * The lists on a phone (spec 6.1). In portrait they are a layer over the app bar that stops at
 * the drawer, so the drawer stays playable under it. In landscape they are docked beside the
 * editor, or folded to a strip. Closed or folded, the lists keep their layout and their scroll.
 */
export function NavigatorLayer({
    view,
    tabList,
    isCovered,
    onViewChange,
    onPlay,
    onOpenFile,
    onNewFile
}: NavigatorLayerProps) {
    const { t } = useTranslation();
    const { state, dispatch, presence, isLandscape } = usePhoneShell();
    const context = useBankEditor();
    const { openMenu } = useContextMenu();
    const isOpen = presence.isShown;
    const tabId = context.session.id;

    const close = () => dispatch({ type: "closeNavigator" });
    // A pick in the lists starts a new path, so back goes to the lists from there
    const pick = (picked: BankEditView) => {
        onViewChange(picked);
        dispatch({ type: "navigatorPick", tabId });
    };
    const listContext = {
        ...context,
        setView: pick,
        applyCreate: (actions: HistoryActionGroup) => {
            const focus = context.session.history.do(actions);
            if (focus) {
                pick(focus);
            }
        },
        // Playing auditions the sample, so the lists stay open and back has no new step
        playSample: (sample: BasicSample) => {
            onViewChange(sample);
            onPlay();
        }
    };

    // The open banks and the add button, a row of their own in portrait
    const tabs = (
        <div className={"navigator_tabs"}>
            {tabList}
            <button
                type={"button"}
                className={"plain_button navigator_button"}
                aria-label={t("phoneLocale.navigator.addBank")}
                aria-haspopup={"dialog"}
                onClick={(e) =>
                    openMenu(
                        e,
                        [
                            {
                                label: t("phoneLocale.overflow.open"),
                                icon: "open",
                                onSelect: onOpenFile
                            },
                            {
                                label: t("phoneLocale.overflow.new"),
                                icon: "new",
                                onSelect: onNewFile
                            }
                        ],
                        {
                            title: t("phoneLocale.navigator.openBanks")
                        }
                    )
                }
            >
                <PlusIcon />
            </button>
        </div>
    );
    const toggleCollapsed = () => dispatch({ type: "toggleCollapsed" });
    // The selection bar takes the place of this bar in selection mode. Docked in landscape the
    // lists cover nothing, so the header has no close or pin button, and as landscape is short
    // it holds the bank tabs instead of a title
    const titleBar = isLandscape ? (
        <div className={"phone_layer_header navigator_dock_header"}>
            {tabs}
            <button
                type={"button"}
                className={"plain_button navigator_button"}
                aria-label={t("phoneLocale.navigator.collapse")}
                onClick={toggleCollapsed}
            >
                <SidebarCollapseIcon />
            </button>
        </div>
    ) : (
        <PhoneLayerHeader
            icon={"close"}
            buttonLabel={t("phoneLocale.navigator.close")}
            onButton={close}
            title={t("phoneLocale.navigator.title")}
        >
            <button
                type={"button"}
                className={"plain_button navigator_button"}
                aria-label={t("phoneLocale.navigator.keepOpen")}
                aria-pressed={state.isNavigatorPinned}
                onClick={() => dispatch({ type: "togglePinned" })}
            >
                <PinIcon />
            </button>
        </PhoneLayerHeader>
    );
    const header = (
        <>
            {isLandscape ? null : tabs}
            <button
                type={"button"}
                className={"plain_button navigator_overview"}
                aria-current={view === "info"}
                onClick={() => pick("info")}
            >
                <InfoIcon />
                <span className={"navigator_overview_label"}>
                    {t("phoneLocale.navigator.overview")}
                </span>
                <ChevronRightIcon />
            </button>
        </>
    );

    // One tree for both orientations, so a rotation keeps the lists and their scroll. Docked,
    // only the panel goes inert, as the strip next to it expands it
    return (
        <div
            className={"navigator_layer"}
            data-open={isOpen}
            inert={!isLandscape && !isOpen}
        >
            <div className={"navigator_panel"} inert={isLandscape && !isOpen}>
                <BankEditorContext value={listContext}>
                    {/* The closed lists must not act on keys either */}
                    <MenuList
                        view={view}
                        isCovered={isCovered || !isOpen}
                        onPreview={onViewChange}
                        titleBar={titleBar}
                        header={header}
                    />
                </BankEditorContext>
            </div>
            {isLandscape ? (
                isOpen ? null : (
                    <button
                        type={"button"}
                        className={"plain_button navigator_strip"}
                        aria-label={t("phoneLocale.navigator.expand")}
                        onClick={toggleCollapsed}
                    >
                        <SidebarExpandIcon />
                    </button>
                )
            ) : (
                // The header's close button is the one for the keyboard
                <button
                    type={"button"}
                    className={"plain_button navigator_scrim"}
                    tabIndex={-1}
                    aria-label={t("phoneLocale.navigator.close")}
                    onClick={close}
                />
            )}
        </div>
    );
}
