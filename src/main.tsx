import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app.tsx";
import { StrictMode } from "react";
import { MIDIProvider } from "./settings/midi_context/midi_provider.tsx";

createRoot(document.querySelector("#root")!).render(
    <StrictMode>
        <MIDIProvider>
            <App />
        </MIDIProvider>
    </StrictMode>
);
