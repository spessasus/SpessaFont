import { describe, expect, it, vi } from "vitest";
import {
    createTestSession,
    expectMirrorUpToDate,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import type { SaveFileHandle } from "./persistence.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { BasicSample } from "spessasynth_core";
import type { BankSession } from "./bank_session.ts";

// The real module fetches the encoder's wasm by URL, which Node cannot
vi.mock("./encode_vorbis.ts", () => import("../test_utils/test_vorbis.ts"));

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

    it("sets the SF2 version on an SF2 save, and undo puts the old one back", async () => {
        const session = createTestSession();
        session.document.bank.soundBankInfo.version = { major: 2, minor: 1 };
        publishSetUp(session);
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle())
        );

        await session.save("sf2", "x");

        expect(session.document.bank.soundBankInfo.version).toEqual({
            major: 2,
            minor: 4
        });
        expectMirrorUpToDate(session);
        session.history.undo();
        expect(session.document.bank.soundBankInfo.version).toEqual({
            major: 2,
            minor: 1
        });
        expectMirrorUpToDate(session);
    });
});
