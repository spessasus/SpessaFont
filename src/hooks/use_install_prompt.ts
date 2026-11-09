import { useState } from "react";
import { useEventListener } from "./use_event_listener.ts";

/**
 * The browser's install offer. Returns a function that shows the install
 * prompt, or undefined while the browser has nothing to offer (not installable,
 * already installed, or the offer was used).
 */
export function useInstallPrompt() {
    const [offer, setOffer] = useState<BeforeInstallPromptEvent>();

    useEventListener(globalThis, "beforeinstallprompt", (event) => {
        // keep the offer for our own button instead of the browser's mini bar
        event.preventDefault();
        setOffer(event);
    });
    useEventListener(globalThis, "appinstalled", () => {
        setOffer(undefined);
    });

    if (!offer) {
        return undefined;
    }
    return async () => {
        // a prompt works once, so the event must not stay around
        setOffer(undefined);
        await offer.prompt();
        await offer.userChoice;
    };
}
