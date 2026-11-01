import type { BasicSoundBank, ProgressFunction } from "spessasynth_core";
import { encodeVorbis } from "./encode_vorbis.ts";
import { SOFTWARE_NAME } from "../utils/software_name.ts";
import { downloadBlob } from "../utils/download_blob.ts";

/**
 * "auto" saves in the format the bank was last written in (or loaded from).
 */
export type SaveFormat = "auto" | "sf2" | "dls" | "sf3" | "sf4";

export type WriteFormat = Exclude<SaveFormat, "auto">;

export interface EncodedSoundBank {
    binary: ArrayBuffer;
    extension: WriteFormat;
    /**
     * The format the next "auto" save should use.
     */
    writeFormat: WriteFormat;
}

/**
 * Browsers fail to create a single Blob part larger than this.
 */
const MAX_BLOB_PART = 2_147_483_648;
const BLOB_CHUNK_SIZE = 52_428_800;

export function getInitialWriteFormat(bank: BasicSoundBank): WriteFormat {
    return bank.type === "sfe" ? "sf4" : bank.type;
}

/**
 * Writes the bank in the requested format.
 * Explicit SF2 and SF3 saves decompress or compress the samples in place first.
 */
export async function encodeSoundBank(
    bank: BasicSoundBank,
    format: SaveFormat,
    lastWriteFormat: WriteFormat,
    progressFunction?: ProgressFunction
): Promise<EncodedSoundBank> {
    const options = { progressFunction, software: SOFTWARE_NAME };
    const target = format === "auto" ? lastWriteFormat : format;
    let binary: ArrayBuffer;
    switch (target) {
        case "sf2":
        case "sf3": {
            if (format === "sf2") {
                await bank.setSampleFormat({ format: "pcm", progressFunction });
            } else if (format === "sf3") {
                await bank.setSampleFormat({
                    format: "compressed",
                    compressionFunction: encodeVorbis,
                    progressFunction
                });
            }
            // An SF2 write keeps compressed samples compressed, which preserves SF3 on "auto"
            binary = bank.writeSF2(options);
            break;
        }

        case "sf4": {
            binary = bank.writeSFE(options);
            break;
        }

        case "dls": {
            binary = bank.writeDLS(options);
            break;
        }
    }
    let extension = target;
    if (target === "sf2" || target === "sf3") {
        extension = bank.samples.some((s) => s.isCompressed) ? "sf3" : "sf2";
    }
    return { binary, extension, writeFormat: target };
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
 * Writes the file with the File System Access API when available, otherwise downloads it.
 * Returns the file handle to reuse for the next save.
 * Throws an `AbortError` when the user cancels the file picker.
 * @param binary the file contents
 * @param name the suggested file name
 * @param handle the handle from the previous save, if any
 * @param shouldPickNewFile show the file picker even if a handle exists ("save as")
 */
export async function writeFile(
    binary: ArrayBuffer,
    name: string,
    handle: FileSystemFileHandle | undefined,
    shouldPickNewFile: boolean
) {
    if ("showSaveFilePicker" in globalThis && (shouldPickNewFile || !handle)) {
        handle = await showSaveFilePicker({
            id: "spessafont-save-file",
            suggestedName: name
        });
    }

    if (handle) {
        const writable = await handle.createWritable();
        await writable.write(binary);
        await writable.close();
        return handle;
    }

    downloadBlob(createBlob(binary), name);
    return undefined;
}
