import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { BankEditorContext } from "./bank_editor_context.ts";
import { useBankEditorModel } from "./use_bank_editor_model.ts";
import { BankEditorWindow } from "./bank_editor_window.tsx";

export interface BankEditorProps {
    session: BankSession;
    view: BankEditView;
    onViewChange: (view: BankEditView) => void;
    /**
     * The settings are drawn over the editor, which turns its shortcuts off.
     */
    isCovered: boolean;
}

export function BankEditor({
    session,
    view: selectedView,
    onViewChange,
    isCovered
}: BankEditorProps) {
    const model = useBankEditorModel(session, selectedView, onViewChange);

    return (
        <BankEditorContext value={model.context}>
            <div className={"bank_editor_content"}>
                <MenuList view={model.view} isCovered={isCovered} />
                <BankEditorWindow model={model} />
            </div>
        </BankEditorContext>
    );
}
