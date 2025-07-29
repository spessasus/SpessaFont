import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./get_user_input.css";

// gets user input so the audio context can be resumed
export function GetUserInput({ audioEngine }: { audioEngine: AudioEngine }) {
    const [hidden, setHidden] = useState(false);
    const { t } = useTranslation();

    function onClicked() {
        void audioEngine.resumeContext().then(() => {
            setHidden(true);
        });
    }

    if (hidden) {
        return null;
    }

    return (
        <div
            onClick={onClicked}
            className={"get_user_input"}
            style={{ fontSize: "2rem" }}
        >
            <h1>{t("getUserInput")}</h1>
        </div>
    );
}
