import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./phone_app_bar.css";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useViewName } from "../hooks/use_view_name.ts";
import { useBankDisplayName } from "../hooks/use_bank_display_name.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { HISTORY_LABEL_KEYS } from "../menu_bar/history_label_keys.ts";
import { useBankCommands } from "../menu_bar/use_bank_commands.ts";
import { ListIcon } from "../utils/icons/app_icons.tsx";
import { RedoIcon, UndoIcon } from "../utils/icons/edit_icons.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";
import { getOpenNavigatorAction } from "./phone_shell_state.ts";

interface PhoneAppBarProps {
    /**
     * The active bank, undefined on the welcome screen.
     */
    session: BankSession | undefined;
    view: BankEditView;
    /**
     * Shows the element an undo or redo points at, and raises the drill depth when it differs.
     */
    onViewChange: (view: BankEditView) => void;
    /**
     * Receives the node the editor's tools menu goes into.
     */
    toolsSlotRef: (node: HTMLDivElement | null) => void;
    overflow: ReactNode;
    /**
     * The settings are drawn over the bar, so nothing in it takes the focus.
     */
    isCovered: boolean;
}

interface SessionProps {
    session: BankSession;
}

function DirtyMark() {
    const { t } = useTranslation();
    return (
        <>
            {" "}
            <span aria-hidden={true}>•</span>
            <span className={"phone_app_bar_hidden"}>
                {t("phoneLocale.appBar.unsaved")}
            </span>
        </>
    );
}

function TitleButton({ session, view }: SessionProps & { view: BankEditView }) {
    const { t } = useTranslation();
    const { state, dispatch, isLandscape } = usePhoneShell();
    const title = useViewName(session, view);
    const bankName = useBankDisplayName(session.store);
    const { isDirty } = useHistoryState(session.store);
    const openAction = getOpenNavigatorAction(state, isLandscape);

    return (
        <button
            type={"button"}
            className={"phone_app_bar_title"}
            onClick={() => {
                if (openAction) {
                    dispatch(openAction);
                }
            }}
        >
            <span className={"phone_app_bar_title_line"}>
                <span className={"phone_app_bar_title_text"}>
                    {title ?? t("presetList.overview")}
                </span>
                {/* Landscape has no subtitle, so a collapsed dock still shows the mark */}
                {isLandscape && isDirty ? (
                    <span className={"phone_app_bar_title_mark"}>
                        <DirtyMark />
                    </span>
                ) : null}
            </span>
            {isLandscape ? null : (
                <span className={"phone_app_bar_subtitle"}>
                    {bankName}
                    {isDirty ? <DirtyMark /> : null}
                </span>
            )}
        </button>
    );
}

function HistoryButtons({
    session,
    onViewChange
}: SessionProps & Pick<PhoneAppBarProps, "onViewChange">) {
    const { t } = useTranslation();
    const { undo, redo } = useBankCommands(session, onViewChange);
    const { canUndo, canRedo, undoLabel, redoLabel } = useHistoryState(
        session.store
    );

    // A disabled one stays clickable, so the command says "Nothing to undo"
    return (
        <>
            <button
                type={"button"}
                className={"phone_app_bar_button"}
                aria-disabled={!canUndo}
                onClick={undo}
                aria-label={
                    undoLabel
                        ? t("menuBarLocale.edit.undoWhat", {
                              what: t(HISTORY_LABEL_KEYS[undoLabel])
                          })
                        : t("menuBarLocale.edit.undo")
                }
            >
                <UndoIcon />
            </button>
            <button
                type={"button"}
                className={"phone_app_bar_button"}
                aria-disabled={!canRedo}
                onClick={redo}
                aria-label={
                    redoLabel
                        ? t("menuBarLocale.edit.redoWhat", {
                              what: t(HISTORY_LABEL_KEYS[redoLabel])
                          })
                        : t("menuBarLocale.edit.redo")
                }
            >
                <RedoIcon />
            </button>
        </>
    );
}

/**
 * The phone's top bar (spec 4.3): the lists button, the shown element over the bank name, the
 * tools slot, undo and redo, and the overflow button.
 */
export function PhoneAppBar({
    session,
    view,
    onViewChange,
    toolsSlotRef,
    overflow,
    isCovered
}: PhoneAppBarProps) {
    const { t } = useTranslation();
    const { dispatch, isLandscape } = usePhoneShell();

    return (
        <header className={"phone_app_bar"} inert={isCovered}>
            {/* The docked lists need no button in landscape */}
            {session && !isLandscape ? (
                <button
                    type={"button"}
                    className={"phone_app_bar_button"}
                    aria-label={t("phoneLocale.appBar.openLists")}
                    onClick={() => dispatch({ type: "openNavigator" })}
                >
                    <ListIcon />
                </button>
            ) : null}
            {session ? (
                <TitleButton session={session} view={view} />
            ) : (
                <span className={"phone_app_bar_title"}>
                    <span className={"phone_app_bar_title_line"}>
                        SpessaFont
                    </span>
                </span>
            )}
            <div
                ref={toolsSlotRef}
                className={"phone_app_bar_tools_slot"}
                role={"group"}
                aria-label={t("phoneLocale.appBar.tools")}
            />
            {session ? (
                <HistoryButtons session={session} onViewChange={onViewChange} />
            ) : null}
            {overflow}
        </header>
    );
}
