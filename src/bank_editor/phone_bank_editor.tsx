import { type ReactNode, useState } from "react";
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
import { ViewBarSlotContext } from "../phone_shell/view_bar_slot.ts";

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
    const { dispatch, presence, isLandscape } = usePhoneShell();
    // Landscape moves the grid's view bar into the element bar row
    const [viewBarSlot, setViewBarSlot] = useState<HTMLDivElement | null>(null);
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
            {/* The open navigator covers the editor in portrait */}
            <div
                className={"bank_editor_content"}
                inert={presence.isCoveringEditor}
            >
                <div className={"element_bar_row"}>
                    <ElementBar
                        view={view}
                        onSampleSection={model.setSampleSection}
                    />
                    <div ref={setViewBarSlot} className={"view_bar_slot"} />
                </div>
                <ViewBarSlotContext value={isLandscape ? viewBarSlot : null}>
                    <BankEditorWindow
                        model={model}
                        sampleSection={model.sampleSection}
                        onSampleSectionChange={model.setSampleSection}
                    />
                </ViewBarSlotContext>
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
