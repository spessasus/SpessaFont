import { useEffect, useEffectEvent } from "react";

/**
 * Receives the files the OS opens with the installed web app (File Handling API).
 */
export function useLaunchQueue(onFile: (file: File) => Promise<void>) {
    const handleFile = useEffectEvent(onFile);
    useEffect(() => {
        if (typeof launchQueue === "undefined") {
            return;
        }
        // The API cannot remove a consumer, and setting a new one replaces the old one
        launchQueue.setConsumer(async ({ files }) => {
            for (const handle of files) {
                await handleFile(await handle.getFile());
            }
        });
    }, []);
}
