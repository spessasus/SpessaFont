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
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Presence } from "../presence/presence.tsx";
import { usePresence } from "../hooks/use_presence.ts";

interface SoundBankInfoProps {
    /**
     * Kept by the editor, so the bank check is still open after going to one of its elements
     * and back.
     */
    panel: InfoPanel;
    onPanelChange: (panel: InfoPanel) => void;
}

export function SoundBankInfo({ panel, onPanelChange }: SoundBankInfoProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { session } = useBankEditor();
    const views = useBankSnapshot(session.store, (s) => s.views);
    const info = useBankSnapshot(session.store, (s) => s.info);
    const format = useBankSnapshot(session.store, (s) => s.format);
    // The stats show the count and the panel the list, so the check runs once for both
    const issues = checkBank(views, info, format);

    let content;
    switch (panel) {
        case "modulators": {
            content = (
                <DefaultModulators onBack={() => onPanelChange("info")} />
            );
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

    const stats = (
        <BankInfoStats
            issueCount={issues.length}
            panel={panel}
            // The buttons open their panel, or go back to the info when it is open
            onTogglePanel={(target) =>
                onPanelChange(panel === target ? "info" : target)
            }
        />
    );

    // A phone opens the panels over the info, which stays under them
    if (layout === "phone") {
        return (
            <div className={"overview_stack"}>
                <div className={"sound_bank_info"} inert={panel !== "info"}>
                    <EditableInfo />
                    {stats}
                </div>
                <Presence>
                    {panel === "info" ? null : (
                        <OverviewPanel>
                            {/* The default modulators put New in their bar, so they render it */}
                            {panel === "check" ? (
                                <OverviewPanelHeader
                                    onBack={() => onPanelChange("info")}
                                    title={t("bankInfo.check.title", {
                                        count: issues.length
                                    })}
                                />
                            ) : null}
                            {content}
                        </OverviewPanel>
                    )}
                </Presence>
            </div>
        );
    }

    return (
        <div className={"sound_bank_info"}>
            {content}
            {stats}
        </div>
    );
}

/**
 * A phone panel over the overview, which slides away when closed.
 */
function OverviewPanel({ children }: { children: ReactNode }) {
    const { ref, isClosing } = usePresence<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={"overview_panel"}
            data-state={isClosing ? "closing" : "open"}
            inert={isClosing}
        >
            {children}
        </div>
    );
}
