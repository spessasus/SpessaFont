import type { BasicSample, SampleStoredData } from "spessasynth_core";

const OGG_PAGE_HEADER_SIZE = 27;

/**
 * An Ogg page with no packets, whose granule position core reads as the stream's length.
 */
function createOggLengthPage(length: number) {
    const page = new Uint8Array(OGG_PAGE_HEADER_SIZE);
    // "OggS"
    page.set([0x4f, 0x67, 0x67, 0x53]);
    const view = new DataView(page.buffer);
    view.setUint32(6, length % 2 ** 32, true);
    view.setUint32(10, Math.floor(length / 2 ** 32), true);
    return page;
}

/**
 * Gives a sample without data the form and length of its data in the mirror, so its view, the
 * copies made from it and the save warnings tell compressed samples from PCM and know the length.
 *
 * Core only sets them through `setLengthWithoutData`, which is internal (CORE_WISHLIST.md, item
 * 6). So the sample gets stand-in data of that form and length and drops it at once: zeroed PCM,
 * or an empty Ogg page whose granule position core reads as the length. The editor only tells
 * compressed samples from PCM, so float32 data counts as s16le here.
 */
export function setSampleFormWithoutData(
    sample: BasicSample,
    form: SampleStoredData["form"],
    length: number
) {
    sample.setStoredData(
        form === "vorbis"
            ? { form, data: createOggLengthPage(length) }
            : { form: "s16le", data: new Uint8Array(length * 2) }
    );
    sample.releaseData();
}
