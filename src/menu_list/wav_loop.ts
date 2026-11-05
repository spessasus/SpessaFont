/**
 * The loop of a WAV file, in frames at the file's sample rate: the first loop of its `smpl`
 * chunk, or else a `cue ` chunk with two unnamed points.
 */
export interface WavLoop {
    start: number;
    /**
     * Exclusive, like a sample's loop end. The chunk stores the last frame of the loop.
     */
    end: number;
    sampleRate: number;
}

const SMPL_UNITY_NOTE = 12;
const SMPL_PITCH_FRACTION = 16;
const SMPL_LOOP_COUNT = 28;
const SMPL_LOOPS = 36;
const LOOP_START = 8;
const LOOP_END = 12;
const CUE_POINT_SIZE = 24;
const CUE_OFFSET = 20;

function readTag(view: DataView, offset: number) {
    return String.fromCodePoint(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
    );
}

/**
 * Whether the four bytes could be a chunk tag (printable ASCII).
 */
function isTag(view: DataView, offset: number) {
    if (offset + 4 > view.byteLength) {
        return false;
    }
    for (let i = 0; i < 4; i++) {
        const byte = view.getUint8(offset + i);
        if (byte < 0x20 || byte > 0x7e) {
            return false;
        }
    }
    return true;
}

function isWavFile(view: DataView) {
    return (
        view.byteLength >= 12 &&
        readTag(view, 0) === "RIFF" &&
        readTag(view, 8) === "WAVE"
    );
}

/**
 * Calls `onChunk` with each chunk of a WAV file (its tag, and where its body starts and its
 * size). Nothing is called for a file that is not a WAV file.
 */
function forEachWavChunk(
    view: DataView,
    onChunk: (tag: string, body: number, size: number) => void
) {
    if (!isWavFile(view)) {
        return;
    }
    for (let offset = 12; offset + 8 <= view.byteLength;) {
        const tag = readTag(view, offset);
        const size = view.getUint32(offset + 4, true);
        const body = offset + 8;
        if (body + size > view.byteLength) {
            break;
        }
        onChunk(tag, body, size);
        // Chunks are padded to an even size with a zero byte. Some writers leave it out, then
        // the next tag starts where the pad byte would be
        const end = body + size;
        offset = size % 2 === 1 && !isTag(view, end) ? end + 1 : end;
    }
}

/**
 * The sample rate a WAV file stores its audio at, from its `fmt ` chunk.
 */
export function readWavSampleRate(file: ArrayBuffer) {
    const view = new DataView(file);
    let sampleRate: number | undefined;
    forEachWavChunk(view, (tag, body, size) => {
        if (tag === "fmt " && size >= 8) {
            sampleRate = view.getUint32(body + 4, true);
        }
    });
    return sampleRate;
}

/**
 * Reads the loop a WAV file carries. The browser decodes the audio but drops the `smpl` chunk,
 * so it is read from the file here. Undefined for other files and files without a loop.
 */
export function readWavLoop(file: ArrayBuffer): WavLoop | undefined {
    const view = new DataView(file);
    let loop: { start: number; end: number } | undefined;
    let cueLoop: { start: number; end: number } | undefined;
    let hasCueLabels = false;
    forEachWavChunk(view, (tag, body, size) => {
        if (
            tag === "smpl" &&
            size >= SMPL_LOOPS + 24 &&
            view.getUint32(body + SMPL_LOOP_COUNT, true) > 0
        ) {
            const first = body + SMPL_LOOPS;
            loop ??= {
                start: view.getUint32(first + LOOP_START, true),
                end: view.getUint32(first + LOOP_END, true) + 1
            };
        } else if (
            tag === "cue " &&
            size >= 4 + 2 * CUE_POINT_SIZE &&
            view.getUint32(body, true) === 2
        ) {
            // Two cue points are a loop, as spessasynth_core writes one (end exclusive)
            const point = (i: number) =>
                view.getUint32(
                    body + 4 + i * CUE_POINT_SIZE + CUE_OFFSET,
                    true
                );
            cueLoop = { start: point(0), end: point(1) };
        } else if (
            tag === "LIST" &&
            size >= 4 &&
            readTag(view, body) === "adtl"
        ) {
            hasCueLabels = true;
        }
    });
    // Audio editors save markers as cue points too, and name them in an "adtl" list.
    // spessasynth_core writes its loop without names.
    loop ??= hasCueLabels ? undefined : cueLoop;
    const sampleRate = readWavSampleRate(file);
    return !loop || !sampleRate || loop.end <= loop.start
        ? undefined
        : { ...loop, sampleRate };
}

/**
 * The key a WAV file says its audio plays at, from its `smpl` chunk: the MIDI unity note, and
 * the pitch fraction above it as the cents to correct. Undefined without a `smpl` chunk.
 */
export function readWavRootKey(file: ArrayBuffer) {
    const view = new DataView(file);
    let rootKey: { key: number; pitchCorrection: number } | undefined;
    forEachWavChunk(view, (tag, body, size) => {
        if (rootKey || tag !== "smpl" || size < SMPL_LOOP_COUNT) {
            return;
        }
        const note = view.getUint32(body + SMPL_UNITY_NOTE, true);
        // The fraction of a semitone the audio is above the note, 0x80000000 is 50 cents
        const fraction = view.getUint32(body + SMPL_PITCH_FRACTION, true);
        const cents = Math.round((fraction / 2 ** 32) * 100);
        // More than half a semitone sharp is closer to the next note, tuned down
        const key = cents > 50 ? note + 1 : note;
        if (key <= 127) {
            rootKey = {
                key,
                pitchCorrection: cents > 50 ? 100 - cents : -cents
            };
        }
    });
    return rootKey;
}
