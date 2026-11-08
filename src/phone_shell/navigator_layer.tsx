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
    CloseIcon,
    PinIcon,
    PlusIcon
} from "../utils/icons/app_icons.tsx";
import { InfoIcon } from "../utils/icons/file_icons.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";

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
 * The lists on a phone (spec 6.1): a layer over the app bar that stops at the drawer, so the
 * drawer stays playable under it. Closed, it keeps its layout, so the lists keep their scroll.
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
    const { state, dispatch } = usePhoneShell();
    const context = useBankEditor();
    const { openMenu } = useContextMenu();
    const isOpen = state.isNavigatorOpen;
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

    // The selection bar takes the place of this bar in selection mode
    const titleBar = (
        <div className={"navigator_header"}>
            <button
                type={"button"}
                className={"plain_button navigator_button"}
                aria-label={t("phoneLocale.navigator.close")}
                onClick={close}
            >
                <CloseIcon />
            </button>
            <h2 className={"navigator_title"}>
                {t("phoneLocale.navigator.title")}
            </h2>
            <button
                type={"button"}
                className={"plain_button navigator_button"}
                aria-label={t("phoneLocale.navigator.keepOpen")}
                aria-pressed={state.isNavigatorPinned}
                onClick={() => dispatch({ type: "togglePinned" })}
            >
                <PinIcon />
            </button>
        </div>
    );
    const header = (
        <>
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

    return (
        <div className={"navigator_layer"} data-open={isOpen} inert={!isOpen}>
            <div className={"navigator_panel"}>
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
            {/* The header's close button is the one for the keyboard */}
            <button
                type={"button"}
                className={"plain_button navigator_scrim"}
                tabIndex={-1}
                aria-label={t("phoneLocale.navigator.close")}
                onClick={close}
            />
        </div>
    );
}
