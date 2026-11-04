import type { BasicSoundBank } from "spessasynth_core";
import { downloadBlob } from "../utils/download_blob.ts";

/**
 * "auto" saves in the format the bank was last written in (or loaded from).
 */
export type SaveFormat = "auto" | "sf2" | "dls" | "sf3" | "sf4";

export type WriteFormat = Exclude<SaveFormat, "auto">;

/**
 * Browsers fail to create a single Blob part larger than this.
 */
const MAX_BLOB_PART = 2_147_483_648;
const BLOB_CHUNK_SIZE = 52_428_800;

export function getInitialWriteFormat(bank: BasicSoundBank): WriteFormat {
    return bank.type === "sfe" ? "sf4" : bank.type;
}

/**
 * The format a save writes, with "auto" meaning the last one.
 */
export function resolveWriteFormat(
    format: SaveFormat,
    lastWriteFormat: WriteFormat
) {
    return format === "auto" ? lastWriteFormat : format;
}

/**
 * The file extension a save in this format gets. SF2 and SF3 share a writer, and the result is
 * SF3 when any sample is compressed: after an explicit SF3 save, or on "auto" with compressed
 * samples (a loaded SF3, or samples pasted from one).
 */
export function getSaveExtension(
    hasCompressedSamples: boolean,
    format: SaveFormat,
    target: WriteFormat
): WriteFormat {
    if (target !== "sf2" && target !== "sf3") {
        return target;
    }
    if (format !== "auto") {
        return format === "sf3" ? "sf3" : "sf2";
    }
    return hasCompressedSamples ? "sf3" : "sf2";
}

function createBlob(binary: ArrayBuffer) {
    if (binary.byteLength <= MAX_BLOB_PART) {
        return new Blob([binary]);
    }
    const chunks = new Array<ArrayBuffer>();
    for (let start = 0; start < binary.byteLength; start += BLOB_CHUNK_SIZE) {
        chunks.push(binary.slice(start, start + BLOB_CHUNK_SIZE));
    }
    return new Blob(chunks);
}

/**
 * The part of a `FileSystemFileHandle` a save uses.
 */
export interface SaveFileHandle {
    readonly name: string;
    createWritable(): Promise<{
        write(data: ArrayBuffer): Promise<void>;
        close(): Promise<void>;
    }>;
}

/**
 * Asks where to save before anything is converted or encoded, so a cancelled picker changes
 * nothing. Returns the handle to write to, or undefined when the browser can only download.
 * Throws an `AbortError` when the user cancels the file picker.
 * @param name the suggested file name
 * @param handle the handle from the previous save, if any
 * @param shouldPickNewFile show the file picker even if a handle exists ("save as")
 */
export async function pickSaveFile(
    name: string,
    handle: SaveFileHandle | undefined,
    shouldPickNewFile: boolean
) {
    if (!("showSaveFilePicker" in globalThis)) {
        return undefined;
    }
    if (handle && !shouldPickNewFile) {
        return handle;
    }
    return showSaveFilePicker({
        id: "spessafont-save-file",
        suggestedName: name
    });
}

/**
 * Writes the file to the picked handle, or downloads it when there is none.
 * Returns the handle to reuse for the next save.
 */
export async function writeFile(
    binary: ArrayBuffer,
    name: string,
    handle: SaveFileHandle | undefined
) {
    if (handle) {
        const writable = await handle.createWritable();
        await writable.write(binary);
        await writable.close();
        return handle;
    }
    downloadBlob(createBlob(binary), name);
    return undefined;
}
