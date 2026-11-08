import type { ReactNode } from "react";
import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import "./bank_editor_phone.css";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { BankEditorProps } from "./bank_editor.tsx";
import { BankEditorContext } from "./bank_editor_context.ts";
import { useBankEditorModel } from "./use_bank_editor_model.ts";
import { BankEditorWindow } from "./bank_editor_window.tsx";
import { usePhoneShell } from "../phone_shell/phone_shell_context.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { ElementBar } from "../phone_shell/element_bar.tsx";
import { getDrillTo } from "../phone_shell/drill_to.ts";

interface PhoneBankEditorProps extends BankEditorProps {
    /**
     * The open banks, shown above the lists.
     */
    tabList: ReactNode;
}

export function PhoneBankEditor({
    session,
    view: selectedView,
    onViewChange,
    isCovered,
    tabList
}: PhoneBankEditorProps) {
    const { state, dispatch } = usePhoneShell();
    const drillTo = getDrillTo(
        session.id,
        selectedView,
        onViewChange,
        dispatch
    );
    const model = useBankEditorModel(session, selectedView, drillTo);
    const { view, context, infoPanel, setInfoPanel } = model;
    // A pick in the lists starts a new path, so back goes to the lists from there
    const listContext = {
        ...context,
        setView: (picked: BankEditView) => {
            onViewChange(picked);
            dispatch({ type: "navigatorPick", tabId: session.id });
        }
    };

    useBackHandler(
        view === "info" && infoPanel !== "info",
        BACK_LEVELS.overviewPanel,
        () => {
            setInfoPanel("info");
            return true;
        }
    );

    return (
        <BankEditorContext value={context}>
            <div className={"bank_editor_content"}>
                <ElementBar view={view} />
                <BankEditorWindow model={model} />
            </div>
            <div
                className={"phone_lists_layer"}
                data-open={state.isNavigatorOpen}
                inert={!state.isNavigatorOpen}
            >
                {tabList}
                <BankEditorContext value={listContext}>
                    {/* The closed lists must not act on keys either */}
                    <MenuList
                        view={view}
                        isCovered={isCovered || !state.isNavigatorOpen}
                    />
                </BankEditorContext>
            </div>
        </BankEditorContext>
    );
}
