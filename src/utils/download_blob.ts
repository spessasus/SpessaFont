import { logInfo } from "./core_utils.ts";

/**
 * Downloads data as a file through a temporary link.
 */
export function downloadBlob(blob: Blob, name: string) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    logInfo(`Downloading ${name}`);
    // The download starts asynchronously, so the URL must outlive this call
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
