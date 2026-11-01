import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AudioEngine } from "../core_backend/audio_engine.ts";
import { IS_ELECTRON } from "../utils/environment_detection.ts";
import { AudioEngineContext } from "../core_backend/audio_engine_context.ts";
import { useTranslation } from "react-i18next";
import "./get_user_input.css";
import { useSettings } from "../settings/settings_context.ts";

interface AudioEngineProviderProps {
    children?: ReactNode;
}

export function AudioEngineProvider({ children }: AudioEngineProviderProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
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

    const value = useMemo(() => ({ audioEngine }), [audioEngine]);

    const resume = () => {
        void audioEngine.context.resume().then(() => setReady(true));
    };

    return (
        <AudioEngineContext value={value}>
            {!ready && !IS_ELECTRON && (
                <button
                    type={"button"}
                    onClick={resume}
                    className={"get_user_input"}
                >
                    <h1>{t("getUserInput")}</h1>
                </button>
            )}
            {children}
        </AudioEngineContext>
    );
}
