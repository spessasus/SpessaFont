import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";

export function SoundBankInfo() {
    const [areDefaultModulatorsShown, setAreDefaultModulatorsShown] =
        useState(false);

    function toggleDefaultModulators() {
        setAreDefaultModulatorsShown((shown) => !shown);
    }

    return (
        <div className={"sound_bank_info"}>
            {areDefaultModulatorsShown ? (
                <DefaultModulatorList />
            ) : (
                <EditableBankInfo />
            )}
            <BankInfoStats
                onToggleDefaultModulators={toggleDefaultModulators}
            />
        </div>
    );
}
