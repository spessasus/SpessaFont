import { type SavedSettingsType } from "../settings/save_load/settings_typedef.ts";
import * as React from "react";
import { useEffect, useState } from "react";
import { AudioEngine } from "../core_backend/audio_engine.ts";
import { IS_ELECTRON } from "../utils/environment_detection.ts";
import { AudioEngineContext } from "../core_backend/audio_engine_context.ts";
import { useTranslation } from "react-i18next";
import "./get_user_input.css";

export function AudioEngineProvider({
    children,
    settings
}: {
    children: React.ReactNode;
    settings: SavedSettingsType;
}) {
    const { t } = useTranslation();
    const [ready, setReady] = useState(false);
    const [audioEngine] = useState(() => {
        const context = new AudioContext({
            sampleRate: settings.sampleRate,
            latencyHint: "interactive"
        });

        return new AudioEngine(context, settings);
    });

    useEffect(() => {
        void audioEngine.resumeContext().then(() => {
            setReady(true);
        });
    }, [audioEngine]);

    const resume = () => {
        void audioEngine.context.resume().then(() => setReady(true));
    };

    return (
        <AudioEngineContext.Provider value={{ audioEngine }}>
            {!ready && !IS_ELECTRON && (
                <div
                    onClick={resume}
                    className={"get_user_input"}
                    style={{ fontSize: "2rem" }}
                >
                    <h1>{t("getUserInput")}</h1>
                </div>
            )}
            {children}
        </AudioEngineContext.Provider>
    );
}
