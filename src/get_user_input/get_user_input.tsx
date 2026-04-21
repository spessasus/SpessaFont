import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./get_user_input.css";
import { IS_ELECTRON } from "../utils/environment_detection.ts";

// gets user input so the audio context can be resumed
export function GetUserInput({ audioEngine }: { audioEngine: AudioEngine }) {
    const [hidden, setHidden] = useState(false);
    const { t } = useTranslation();

    // Wait for the context to be resumed (will resume automatically in PWA)
    useEffect(() => {
        void audioEngine.resumeContext().then(() => {
            setHidden(true);
        });
    }, [audioEngine]);

    // Resume manually
    const onClicked = () => void audioEngine.context.resume();

    if (hidden) {
        return null;
    }

    if (IS_ELECTRON) {
        return <></>;
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
