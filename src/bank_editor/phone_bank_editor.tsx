import type { ReactNode } from "react";
import "./bank_editor.css";
import "./bank_editor_phone.css";
import type { BankEditorProps } from "./bank_editor.tsx";
import { BankEditorContext } from "./bank_editor_context.ts";
import { useBankEditorModel } from "./use_bank_editor_model.ts";
import { BankEditorWindow } from "./bank_editor_window.tsx";
import { usePhoneShell } from "../phone_shell/phone_shell_context.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { ElementBar } from "../phone_shell/element_bar.tsx";
import { getDrillTo } from "../phone_shell/drill_to.ts";
import { NavigatorLayer } from "../phone_shell/navigator_layer.tsx";

interface PhoneBankEditorProps extends BankEditorProps {
    /**
     * The open banks, shown above the lists.
     */
    tabList: ReactNode;
    onOpenFile: () => void;
    onNewFile: () => void;
}

export function PhoneBankEditor({
    session,
    view: selectedView,
    onViewChange,
    isCovered,
    tabList,
    onOpenFile,
    onNewFile
}: PhoneBankEditorProps) {
    const { state, dispatch } = usePhoneShell();
    const drillTo = getDrillTo(
        session.id,
        selectedView,
        onViewChange,
        dispatch
    );
    const model = useBankEditorModel(session, selectedView, drillTo);
    const { view, context, infoPanel, setInfoPanel, startPlaying } = model;

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
            {/* The open navigator covers the editor */}
            <div
                className={"bank_editor_content"}
                inert={state.isNavigatorOpen}
            >
                <ElementBar
                    view={view}
                    onSampleSection={model.setSampleSection}
                />
                <BankEditorWindow
                    model={model}
                    sampleSection={model.sampleSection}
                    onSampleSectionChange={model.setSampleSection}
                />
            </div>
            <NavigatorLayer
                view={view}
                tabList={tabList}
                isCovered={isCovered}
                onViewChange={onViewChange}
                onPlay={startPlaying}
                onOpenFile={onOpenFile}
                onNewFile={onNewFile}
            />
        </BankEditorContext>
    );
}
