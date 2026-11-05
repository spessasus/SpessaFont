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
    // Not revoked for now: a large file is still being read long after the click, and revoking
    // it a second later broke the download of a 1.3 GB bank. This keeps the blob until reload.
}
