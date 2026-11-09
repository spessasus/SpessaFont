import { EditableInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./bank_info_stats.tsx";
import "./sound_bank_info.css";
import "./sound_bank_info_phone.css";
import "./default_modulators/default_modulators.css";
import "./default_modulators/default_modulators_phone.css";
import { DefaultModulators } from "./default_modulators/default_modulators.tsx";
import { BankCheck } from "./bank_check/bank_check.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { checkBank } from "./bank_check/check_bank.ts";
import type { InfoPanel } from "./info_panel.ts";
import { OverviewPanelHeader } from "./overview_panel_header.tsx";
import { useLayout } from "../layout/layout_context.ts";

interface SoundBankInfoProps {
    /**
     * Kept by the editor, so the bank check is still open after going to one of its elements
     * and back.
     */
    panel: InfoPanel;
    onPanelChange: (panel: InfoPanel) => void;
}

export function SoundBankInfo({ panel, onPanelChange }: SoundBankInfoProps) {
    const layout = useLayout();
    const { session } = useBankEditor();
    const views = useBankSnapshot(session.store, (s) => s.views);
    const info = useBankSnapshot(session.store, (s) => s.info);
    // The stats show the count and the panel the list, so the check runs once for both
    const issues = checkBank(views, info);

    let content;
    switch (panel) {
        case "modulators": {
            content = <DefaultModulators />;
            break;
        }

        case "check": {
            content = <BankCheck issues={issues} />;
            break;
        }

        case "info": {
            content = <EditableInfo />;
        }
    }

    if (layout === "phone" && panel !== "info") {
        return (
            <div className={"overview_panel"}>
                <OverviewPanelHeader onBack={() => onPanelChange("info")} />
                {content}
            </div>
        );
    }

    return (
        <div className={"sound_bank_info"}>
            {content}
            <BankInfoStats
                issueCount={issues.length}
                panel={panel}
                // The buttons open their panel, or go back to the info when it is open
                onTogglePanel={(target) =>
                    onPanelChange(panel === target ? "info" : target)
                }
            />
        </div>
    );
}
