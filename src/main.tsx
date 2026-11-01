import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app.tsx";
import { StrictMode } from "react";
import { MIDIProvider } from "./settings/midi_context/midi_provider.tsx";
import { AudioEngineProvider } from "./get_user_input/audio_engine_provider.tsx";
import { ErrorBoundary } from "./error_boundary/error_boundary.tsx";
import { SettingsProvider } from "./settings/settings_provider.tsx";
import { ClipboardProvider } from "./clipboard/clipboard_provider.tsx";
import { init } from "./init.ts";
import { TranslatedOptionsProvider } from "./utils/translated_options/translated_options_provider.tsx";
import { logError } from "./utils/core_utils.ts";
import type { SavedSettingsType } from "./settings/save_load/settings_typedef.ts";

function render(settings: SavedSettingsType) {
    const root = document.querySelector("#root");
    if (!(root instanceof HTMLElement)) {
        throw new TypeError("The #root element is missing from index.html.");
    }
    createRoot(root).render(
        <StrictMode>
            <ErrorBoundary>
                <SettingsProvider initialSettings={settings}>
                    <TranslatedOptionsProvider>
                        <MIDIProvider>
                            <AudioEngineProvider>
                                <ClipboardProvider>
                                    <App />
                                </ClipboardProvider>
                            </AudioEngineProvider>
                        </MIDIProvider>
                    </TranslatedOptionsProvider>
                </SettingsProvider>
            </ErrorBoundary>
        </StrictMode>
    );
}

try {
    render(await init());
} catch (error) {
    logError("SpessaFont failed to start.", error);
}
