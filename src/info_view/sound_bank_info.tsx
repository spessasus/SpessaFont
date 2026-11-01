import { EditableBankInfo } from "./editable_info.tsx";
import { BankInfoStats } from "./stats.tsx";
import "./sound_bank_info.css";
import "./default_modulators/default_modulators.css";
import { type JSX, useState } from "react";
import { DefaultModulatorList } from "./default_modulators/default_modulators.tsx";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";

export function SoundBankInfo({
    clipboard,
    ccOptions,
    destinationOptions
}: {
    clipboard: ClipboardManager;
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
                    clipboard={clipboard}
                />
            ) : (
                <EditableBankInfo />
            )}
            <BankInfoStats toggleDefaultModulators={toggleDefaultModulators} />
        </div>
    );
}
