import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { PianoCaptureBar } from "../phone_shell/piano_capture_bar.tsx";
import { openKeysForCapture } from "../phone_shell/open_keys_for_capture.ts";
import { PhoneShellContext } from "../phone_shell/phone_shell_context.ts";
import { PianoKeysIcon } from "../utils/icons/player_icons.tsx";

interface OriginalKeyFromPianoProps {
    onKey: (key: number) => void;
}

/**
 * Sets a sample's original key from the next key played on the keyboard (phones).
 */
export function OriginalKeyFromPiano({ onKey }: OriginalKeyFromPianoProps) {
    const { t } = useTranslation();
    const [isCapturing, setIsCapturing] = useState(false);
    // Not usePhoneShell, which throws where the properties render without the shell (tests)
    const shell = useContext(PhoneShellContext);
    // While it waits the bar takes the button's place, its Cancel ends the capture
    return isCapturing ? (
        <PianoCaptureBar
            count={1}
            prompt={t("phoneLocale.capture.playKey")}
            onDone={([key]) => {
                setIsCapturing(false);
                onKey(key);
            }}
            onCancel={() => setIsCapturing(false)}
        />
    ) : (
        <button
            type={"button"}
            className={"pretty_button original_key_from_piano"}
            onClick={() => {
                if (shell) {
                    openKeysForCapture(shell.state.drawer, shell.dispatch);
                }
                setIsCapturing(true);
            }}
        >
            <PianoKeysIcon />
            <span>{t("phoneLocale.cellSheet.setFromPiano")}</span>
        </button>
    );
}
