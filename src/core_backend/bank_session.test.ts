import { afterEach, describe, expect, it, vi } from "vitest";
import {
    type BasicSample,
    EmptySample,
    SoundBankLoader
} from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    expectMirrorUpToDate,
    expectViewsUpToDate,
    getMirror,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { ReplaceSampleAudioAction } from "../sample_editor/replace_sample_audio_action.ts";
import { SaveError, type SaveFileHandle } from "./persistence.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { BankSession } from "./bank_session.ts";
import { ClipboardManager } from "./clipboard_manager.ts";

const encoder = vi.hoisted(() => ({ isLoadFailing: false, isFailing: false }));

// The real module fetches the encoder's wasm by URL, which Node cannot
vi.mock("./encode_vorbis.ts", async () => {
    const testEncoder = await import("../test_utils/test_vorbis.ts");
    return {
        ...testEncoder,
        loadVorbisEncoder: () =>
            encoder.isLoadFailing
                ? Promise.reject(new Error("Offline"))
                : Promise.resolve(),
        encodeVorbis: () =>
            encoder.isFailing
                ? Promise.reject(new Error("Out of memory"))
                : testEncoder.encodeVorbis()
    };
});

afterEach(() => {
    encoder.isLoadFailing = false;
    encoder.isFailing = false;
});

function getSampleView(session: BankSession, sample: BasicSample) {
    return session.store.getSnapshot().views.samples.get(getObjectId(sample));
}

/**
 * A handle for "bank.sf2" that runs `onWrite` while the file is being written,
 * so a test can edit the bank in the middle of a save.
 */
function createHandle(onWrite?: () => void, name = "bank.sf2"): SaveFileHandle {
    return {
        name,
        createWritable: () => {
            onWrite?.();
            return Promise.resolve({
                write: () => Promise.resolve(),
                close: () => Promise.resolve()
            });
        }
    };
}

describe("BankSession.save", () => {
    it("changes nothing when the file picker is cancelled", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const data = await session.readStoredData(sample);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.reject(new DOMException("Cancelled", "AbortError"))
        );

        // An SF3 save compresses every sample, so this must happen after the picker
        await expect(session.save("sf3", "x")).rejects.toThrow("Cancelled");

        expect(await session.readStoredData(sample)).toEqual(data);
        expect(sample.isCompressed).toBe(false);
        expect(session.history.canUndo).toBe(false);
        expect(session.history.isDirty).toBe(false);
    });

    it("asks for a new file when an auto save would put SF3 data into a .sf2 file", async () => {
        const session = createTestSession();
        const first = createHandle();
        const picker = vi.fn(() => Promise.resolve(first));
        vi.stubGlobal("showSaveFilePicker", picker);
        await session.save("sf2", "x");
        expect(picker).toHaveBeenCalledTimes(1);

        // A compressed sample, as pasted from an SF3 bank
        session.document.samples[0].setStoredData({
            form: "vorbis",
            data: new Uint8Array(8)
        });
        publishSetUp(session);
        await session.save("auto", "x");

        expect(picker).toHaveBeenCalledTimes(2);
        expect(picker).toHaveBeenLastCalledWith(
            expect.objectContaining({ suggestedName: "x.sf3" })
        );
    });

    it("keeps an edit made while the file is written unsaved", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const file = createHandle(() =>
            session.history.do([
                new EditSampleAction(
                    sample,
                    "originalKey",
                    sample.originalKey,
                    70
                )
            ])
        );
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(file));

        await session.save("sf2", "x");

        expect(session.history.isDirty).toBe(true);
    });
});

describe("ConvertSamplesAction", () => {
    it("records the conversion of an SF3 save, and undo gives the mirror the old data back", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        session.history.do([
            new EditSampleAction(sample, "loopEnd", sample.loopEnd, 100)
        ]);
        const before = await session.readStoredData(sample);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );

        await session.save("sf3", "x");
        const converted = await session.readStoredData(sample);
        expect(converted.form).toBe("vorbis");
        expect(getSampleView(session, sample)?.isCompressed).toBe(true);
        expectMirrorUpToDate(session);
        expect(session.history.isDirty).toBe(false);

        session.history.undo();
        expect(await session.readStoredData(sample)).toEqual(before);
        expect(getSampleView(session, sample)?.isCompressed).toBe(false);
        expect(sample.loopEnd).toBe(100);
        expectMirrorUpToDate(session);

        session.history.redo();
        const redone = await session.readStoredData(sample);
        expect(redone).toEqual(converted);
    });

    it("decodes compressed samples on an SF2 save", async () => {
        const session = createTestSession();
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );
        await session.save("sf3", "x");
        const sample = session.document.samples[0];
        const length = getSampleView(session, sample)?.length;

        await session.save("sf2", "x");

        const decoded = await session.readStoredData(sample);
        expect(decoded.form).not.toBe("vorbis");
        expect(getSampleView(session, sample)).toMatchObject({
            isCompressed: false,
            length
        });
        expectMirrorUpToDate(session);
    });

    it("sets the SF2 version on an SF2 save without an undo step, and keeps the redo steps", async () => {
        const session = createTestSession();
        session.document.bank.soundBankInfo.version = { major: 2, minor: 1 };
        publishSetUp(session);
        const sample = session.document.samples[0];
        session.history.do([
            new EditSampleAction(sample, "originalKey", sample.originalKey, 70)
        ]);
        session.history.undo();
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle())
        );

        await session.save("sf2", "x");

        expect(session.document.bank.soundBankInfo.version).toEqual({
            major: 2,
            minor: 4
        });
        expect(session.history.canUndo).toBe(false);
        expect(session.history.canRedo).toBe(true);
        expect(session.history.isDirty).toBe(false);
        expectMirrorUpToDate(session);
    });
});

/**
 * A handle that keeps what is written to it.
 */
function createRecordingHandle(name: string) {
    const written = new Array<ArrayBuffer>();
    const handle: SaveFileHandle = {
        name,
        createWritable: () =>
            Promise.resolve({
                write: (data: ArrayBuffer) => {
                    written.push(data);
                    return Promise.resolve();
                },
                close: () => Promise.resolve()
            })
    };
    return { handle, written };
}

/**
 * Adds a third, unused sample, so a test can edit the other two during a save and still see a
 * conversion recorded.
 */
function addExtraSample(session: BankSession) {
    const extra = new EmptySample();
    extra.name = "Extra";
    extra.setAudioData(new Float32Array(1000).fill(0.25), 44_100);
    extra.loopEnd = 1000;
    session.document.addSample(extra);
    publishSetUp(session);
    return extra;
}

function getMirrorSample(session: BankSession, sample: BasicSample) {
    const mirrored = getMirror(session).getSample(getObjectId(sample));
    if (!mirrored) {
        throw new Error(`The mirror has no ${sample.name}.`);
    }
    return mirrored;
}

describe("saves while the bank changes", () => {
    it("records the conversion for the samples left when one is deleted during an SF3 save", async () => {
        const session = createTestSession();
        const extra = addExtraSample(session);
        const kept = session.document.samples.find((s) => s !== extra);
        if (!kept) throw new Error("No sample to keep.");
        const { handle, written } = createRecordingHandle("bank.sf3");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await session.save("sf3", "x", () => {
            if (session.document.samples.includes(extra)) {
                session.history.do([new DeleteSampleAction(extra)]);
            }
        });

        expect(written).toHaveLength(1);
        expect(session.history.state.undoLabel).toBe("convertSamples");
        expect(session.history.isDirty).toBe(true);
        expect(getSampleView(session, kept)?.isCompressed).toBe(true);
        expect(getMirrorSample(session, kept).isCompressed).toBe(true);
        // The removed sample was not converted in the editor, so not in the mirror either
        expect(getMirrorSample(session, extra).isCompressed).toBe(false);
        expectMirrorUpToDate(session);
        expectViewsUpToDate(session);

        session.history.undo();
        expect(getMirrorSample(session, kept).isCompressed).toBe(false);
        session.history.undo();
        expect(getSampleView(session, extra)?.isCompressed).toBe(false);
        expect(getMirrorSample(session, extra).isCompressed).toBe(false);
        expectMirrorUpToDate(session);
        expectViewsUpToDate(session);
    });

    it("keeps edits made during an SF3 save when the conversion is undone", async () => {
        const session = createTestSession();
        const extra = addExtraSample(session);
        const [looped, replaced] = session.document.samples.filter(
            (s) => s !== extra
        );
        const replacedBefore = await session.readStoredData(replaced);
        const newAudio = new Float32Array(500).fill(0.5);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );

        let isEdited = false;
        await session.save("sf3", "x", () => {
            if (isEdited) return;
            isEdited = true;
            session.history.do([
                new EditSampleAction(looped, "loopEnd", looped.loopEnd, 50)
            ]);
            session.history.do([
                new ReplaceSampleAudioAction(replaced, replacedBefore, {
                    data: newAudio,
                    sampleRate: 44_100
                })
            ]);
        });

        // Only the sample nothing touched is converted
        expect(getSampleView(session, extra)?.isCompressed).toBe(true);
        expect(getSampleView(session, looped)?.isCompressed).toBe(false);
        expect(getMirrorSample(session, looped).isCompressed).toBe(false);
        expect(await session.readAudio(replaced)).toEqual(newAudio);
        expectMirrorUpToDate(session);

        session.history.undo();
        expect(session.history.state.undoLabel).toBe("changeAudio");
        expect(getSampleView(session, extra)?.isCompressed).toBe(false);
        expect(looped.loopEnd).toBe(50);
        expect(getMirrorSample(session, looped).loopEnd).toBe(50);
        expect(await session.readAudio(replaced)).toEqual(newAudio);
        expectMirrorUpToDate(session);
        expectViewsUpToDate(session);
    });

    it("writes nothing when the tab closes during an SF3 save", async () => {
        const session = createTestSession();
        const { handle, written } = createRecordingHandle("bank.sf3");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await expect(
            session.save("sf3", "x", () => session.close())
        ).rejects.toThrow(expect.objectContaining({ name: "AbortError" }));

        expect(written).toHaveLength(0);
        expect(() => getMirror(session)).toThrow("No bank is open");
    });

    it("gives copies made from the bank during an SF3 save the data their views describe", async () => {
        const host = createTestHost();
        const saved = createTestSession(host);
        const pasted = createTestSession(host);
        const dropped = createTestSession(host);
        const sample = saved.document.samples[0];
        const clipboard = new ClipboardManager();
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );

        let isCopied = false;
        await saved.save("sf3", "x", () => {
            if (isCopied) return;
            isCopied = true;
            clipboard.copySamples(new Set([sample]), saved);
            pasted.history.do(clipboard.pasteSamples(pasted));
            dropped.history.do(
                clipboard.cloneElements(dropped, { samples: [sample] }, saved)
            );
        });

        for (const session of [pasted, dropped]) {
            const copy = session.document.samples.at(-1);
            if (!copy) throw new Error("No copy.");
            expect(getSampleView(session, copy)?.isCompressed).toBe(false);
            expect(getMirrorSample(session, copy).isCompressed).toBe(false);
            expectMirrorUpToDate(session);
        }
        expect(getMirrorSample(saved, sample).isCompressed).toBe(true);
    });

    it("lets a second save wait for the first", async () => {
        const session = createTestSession();
        const { handle, written } = createRecordingHandle("bank.sf3");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await Promise.all([session.save("sf3", "x"), session.save("sf3", "x")]);

        expect(written).toHaveLength(2);
        expect(session.history.position).toBe(1);
        expect(session.history.isDirty).toBe(false);
    });

    it("keeps the bank dirty when a merged edit or an undo and a new edit happen during the write", async () => {
        const merged = createTestSession();
        const sample = merged.document.samples[0];
        const editKey = (key: number) =>
            new EditSampleAction(
                sample,
                "originalKey",
                sample.originalKey,
                key
            );
        merged.history.do([editKey(61)], "key");
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(
                createHandle(() => merged.history.do([editKey(62)], "key"))
            )
        );
        await merged.save("sf2", "x");
        expect(merged.history.position).toBe(1);
        expect(merged.history.isDirty).toBe(true);

        const replaced = createTestSession();
        const other = replaced.document.samples[0];
        replaced.history.do([
            new EditSampleAction(other, "originalKey", other.originalKey, 61)
        ]);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(
                createHandle(() => {
                    replaced.history.undo();
                    replaced.history.do([
                        new EditSampleAction(other, "originalKey", 60, 70)
                    ]);
                })
            )
        );
        await replaced.save("sf2", "x");
        expect(replaced.history.position).toBe(1);
        expect(replaced.history.isDirty).toBe(true);
    });

    it("fails an SF3 save and changes nothing when the encoder cannot load", async () => {
        encoder.isLoadFailing = true;
        const session = createTestSession();
        const sample = session.document.samples[0];
        const { handle, written } = createRecordingHandle("bank.sf3");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await expect(session.save("sf3", "x")).rejects.toThrow(
            expect.objectContaining({ failure: "encoderUnavailable" })
        );

        expect(written).toHaveLength(0);
        expect(getMirrorSample(session, sample).isCompressed).toBe(false);
        expect(session.history.canUndo).toBe(false);
    });

    it("fails an SF3 save whose samples could not be compressed, and puts them back", async () => {
        encoder.isFailing = true;
        const session = createTestSession();
        const { handle, written } = createRecordingHandle("bank.sf3");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await expect(session.save("sf3", "x")).rejects.toThrow(
            "could not be compressed"
        );

        expect(written).toHaveLength(0);
        expect(getMirror(session).bank.soundBankInfo.version.major).toBe(2);
        expect(session.history.canUndo).toBe(false);
        expectMirrorUpToDate(session);
    });

    it("puts the converted samples back when writing fails after the conversion", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        vi.spyOn(getMirror(session).bank, "writeSF2").mockImplementation(() => {
            throw new Error("Out of memory");
        });
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );

        await expect(session.save("sf3", "x")).rejects.toThrow(SaveError);

        expect(getMirrorSample(session, sample).isCompressed).toBe(false);
        expect(getSampleView(session, sample)?.isCompressed).toBe(false);
        expect(session.history.canUndo).toBe(false);
    });
});

describe("copies of converted samples", () => {
    it("carry the converted form and length, so an auto save of another bank asks for .sf3", async () => {
        const host = createTestHost();
        const converted = createTestSession(host);
        const other = createTestSession(host);
        const sample = converted.document.samples[0];
        // A rate the SF3 conversion resamples
        converted.history.do([
            new EditSampleAction(
                sample,
                "sampleRate",
                sample.sampleRate,
                192_000
            )
        ]);
        const picker = vi.fn((options: { suggestedName: string }) =>
            Promise.resolve(createHandle(undefined, options.suggestedName))
        );
        vi.stubGlobal("showSaveFilePicker", picker);
        await other.save("sf2", "other");
        await converted.save("sf3", "x");
        expect(converted.hasCompressedSamples()).toBe(true);

        const copyInto = (session: BankSession) => {
            const before = new Set(session.document.samples);
            session.history.do(
                new ClipboardManager().cloneElements(
                    session,
                    { samples: [sample] },
                    converted
                )
            );
            const copy = session.document.samples.find((s) => !before.has(s));
            if (!copy) throw new Error("No copy.");
            return copy;
        };

        for (const session of [converted, other]) {
            const copy = copyInto(session);
            const mirrored = getMirrorSample(session, copy);
            expect(getSampleView(session, copy)).toMatchObject({
                isCompressed: true,
                length: mirrored.sampleLength
            });
            expect(mirrored.isCompressed).toBe(true);
        }
        await other.save("auto", "other");
        expect(picker).toHaveBeenLastCalledWith(
            expect.objectContaining({ suggestedName: "other.sf3" })
        );
    });

    it("are PCM after an SF2 save of compressed samples, and the SF2 warning follows", async () => {
        const session = createTestSession();
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.sf3"))
        );
        await session.save("sf3", "x");
        await session.save("sf2", "x");
        expect(session.hasCompressedSamples()).toBe(false);

        const sample = session.document.samples[0];
        session.history.do(
            new ClipboardManager().cloneElements(session, { samples: [sample] })
        );
        const copy = session.document.samples.at(-1);
        if (!copy) throw new Error("No copy.");
        expect(getSampleView(session, copy)?.isCompressed).toBe(false);
        expect(session.hasCompressedSamples()).toBe(false);
    });
});

describe("DLS saves", () => {
    it("write each sample's own data and leave the mirror's links alone", async () => {
        const session = createTestSession();
        const { handle, written } = createRecordingHandle("bank.dls");
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));

        await session.save("dls", "x");

        const saved = SoundBankLoader.fromArrayBuffer(written[0]);
        expect(saved.samples.map((s) => s.sampleLength)).toEqual(
            getMirror(session).bank.samples.map((s) => s.sampleLength)
        );
        expectMirrorUpToDate(session);
    });

    it("fail with a clear reason when a preset flattens to too many regions", async () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const [instrument] = session.document.instruments;
        const [sample] = session.document.samples;
        for (let key = 0; key < 128; key++) {
            instrument.createZone(sample).keyRange = { min: key, max: key };
        }
        for (let velocity = 0; velocity < 128; velocity++) {
            preset.createZone(instrument).velRange = {
                min: velocity,
                max: velocity
            };
        }
        publishSetUp(session);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle(undefined, "bank.dls"))
        );

        await expect(session.save("dls", "x")).rejects.toThrow(
            expect.objectContaining({ failure: "dlsTooLarge" })
        );
        expectMirrorUpToDate(session);
    });
});

describe("loading", () => {
    it("takes the length of an undecodable compressed sample from the mirror", async () => {
        // A sample flagged as compressed whose data is no Ogg stream, like FLAC
        const bank = getMirror(createTestSession()).bank;
        bank.samples[0].setStoredData({
            form: "vorbis",
            data: new Uint8Array(64).fill(7)
        });
        const file = bank.writeSF2();
        const { loadSoundBank } = await import("./load_sound_bank.ts");
        const host = createTestHost();
        const { BankSession } = await import("./bank_session.ts");
        const session = new BankSession(host.client, loadSoundBank(file));
        const sample = session.document.samples.find(
            (s) => s.name === bank.samples[0].name
        );
        if (!sample) throw new Error("No sample.");

        expect(session.undecodableSampleCount).toBe(1);
        const mirrorLength = host.host
            .getMirrorOf(session.id)
            .getSample(getObjectId(sample))?.sampleLength;
        await vi.waitFor(() => {
            expect(getSampleView(session, sample)?.length).toBe(mirrorLength);
        });
        expect(mirrorLength).toBeGreaterThan(0);
        expect(sample.sampleLength).toBe(mirrorLength);
    });
});
