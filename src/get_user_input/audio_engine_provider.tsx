import type { ReactNode } from "react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { AudioEngine } from "../core_backend/audio_engine.ts";
import { IS_ELECTRON } from "../utils/environment_detection.ts";
import { AudioEngineContext } from "../core_backend/audio_engine_context.ts";
import { useTranslation } from "react-i18next";
import "./get_user_input.css";
import { useSettings } from "../settings/settings_context.ts";
import toast from "react-hot-toast";
import { logError } from "../utils/core_utils.ts";
import { useHostErrorToasts } from "../hooks/use_host_error_toasts.ts";

interface AudioEngineProviderProps {
    children?: ReactNode;
}

export function AudioEngineProvider({ children }: AudioEngineProviderProps) {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettings();
    const [ready, setReady] = useState(false);
    // A saved rate this browser does not support would otherwise stop the app on every start
    const [{ audioEngine, rejectedRate }] = useState(() => {
        try {
            const context = new AudioContext({
                sampleRate: settings.sampleRate,
                latencyHint: "interactive"
            });
            return {
                audioEngine: new AudioEngine(context, settings),
                rejectedRate: undefined
            };
        } catch (error) {
            logError(
                `Sample rate ${settings.sampleRate} is not supported.`,
                error
            );
            const context = new AudioContext({ latencyHint: "interactive" });
            return {
                audioEngine: new AudioEngine(context, settings),
                rejectedRate: settings.sampleRate
            };
        }
    });

    // Effect events, so a language change does not show the start-up errors again
    const handleRateRejected = useEffectEvent((rate: number) => {
        const fallback = audioEngine.context.sampleRate;
        // Saved, so the next start does not try the rejected rate again
        updateSettings({ sampleRate: fallback });
        toast.error(
            t("settingsLocale.audioEngine.sampleRateRejected", {
                rate,
                fallback
            }),
            { id: "sampleRateRejected" }
        );
    });
    const handleMainThreadHost = useEffectEvent(() => {
        toast.error(t("settingsLocale.audioEngine.workerFailed"), {
            id: "workerFailed"
        });
    });

    useEffect(() => {
        if (rejectedRate !== undefined) {
            handleRateRejected(rejectedRate);
        }
    }, [rejectedRate]);

    useHostErrorToasts(audioEngine);

    useEffect(() => {
        let isIgnored = false;
        void audioEngine.hostMode.then((mode) => {
            if (!isIgnored && mode === "main thread") {
                handleMainThreadHost();
            }
        });
        return () => {
            isIgnored = true;
        };
    }, [audioEngine]);

    useEffect(() => {
        let isIgnored = false;
        void audioEngine.resumeContext().then(() => {
            if (!isIgnored) {
                setReady(true);
            }
        });
        return () => {
            isIgnored = true;
        };
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
