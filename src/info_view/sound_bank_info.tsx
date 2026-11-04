import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";
import { BankCheck } from "./bank_check/bank_check.tsx";

export function SoundBankInfo() {
    type InfoPanel = "info" | "modulators" | "check";
    const [panel, setPanel] = useState<InfoPanel>("info");

    // The buttons open their panel, or go back to the info when it is open
    const toggle = (target: InfoPanel) =>
        setPanel((shown) => (shown === target ? "info" : target));

    let content;
    switch (panel) {
        case "modulators": {
            content = <DefaultModulatorList />;
            break;
        }

        case "check": {
            content = <BankCheck />;
            break;
        }

        case "info": {
            content = <EditableBankInfo />;
        }
    }

    return (
        <div className={"sound_bank_info"}>
            {content}
            <BankInfoStats
                onToggleDefaultModulators={() => toggle("modulators")}
                onToggleBankCheck={() => toggle("check")}
            />
        </div>
    );
}
