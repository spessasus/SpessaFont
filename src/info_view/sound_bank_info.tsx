import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { type JSX, useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";

export function SoundBankInfo({
    ccOptions,
    destinationOptions
}: {
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
}) {
    const [areDefaultModulatorsShown, setAreDefaultModulatorsShown] =
        useState(false);

    function toggleDefaultModulators() {
        setAreDefaultModulatorsShown((shown) => !shown);
    }

    return (
        <div className={"sound_bank_info"}>
            {areDefaultModulatorsShown ? (
                <DefaultModulatorList
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                />
            ) : (
                <EditableBankInfo />
            )}
            <BankInfoStats toggleDefaultModulators={toggleDefaultModulators} />
        </div>
    );
}
