import { Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { type JSX, useCallback, useState } from "react";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import type { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { SetDefaultModulators } from "./set_default_modulators.tsx";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";

export function DefaultModulatorList({
    manager,
    clipboard,
    ccOptions,
    destinationOptions
}: {
    manager: SoundBankManager;
    clipboard: ClipboardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
}) {
    const [dmods, setDmods] = useState(manager.defaultModulators);
    const {
        audioEngine: { processor }
    } = useAudioEngine();

    const { t } = useTranslation();

    const update = useCallback(() => {
        setDmods([...manager.defaultModulators]);
        processor.clearCache();
    }, [processor, manager.defaultModulators]);
    if (dmods === undefined) {
        return <></>;
    }
    const setDefaultModulators = (mods: Modulator[]) => {
        if (manager === undefined) {
            return;
        }
        processor.clearCache();
        manager.modifyBank([
            new SetDefaultModulators(update, mods, manager.defaultModulators)
        ]);
    };

    return (
        <div className={"default_modulators"}>
            <h2 className={"default_modulators_title"}>
                {t("bankInfo.defaultModulatorsFor")}{" "}
                <i>{manager.getBankName(t("bankInfo.unnamed"))}</i>:
            </h2>
            <ModulatorList
                destinationOptions={destinationOptions}
                ccOptions={ccOptions}
                clipboardManager={clipboard}
                modulatorList={dmods}
                setModulatorList={setDefaultModulators}
                defaultModulators={[]} // can't override default modulators when editing default modulators
            ></ModulatorList>
        </div>
    );
}
