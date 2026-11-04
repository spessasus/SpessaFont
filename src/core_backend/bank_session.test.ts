import { describe, expect, it, vi } from "vitest";
import {
    createTestSession,
    expectMirrorUpToDate,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import {
    captureBankFormat,
    ConvertSamplesAction
} from "./convert_samples_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import type { SaveFileHandle } from "./persistence.ts";
import { getObjectId } from "../utils/object_id.ts";

/**
 * A handle for "bank.sf2" that runs `onWrite` while the file is being written,
 * so a test can edit the bank in the middle of a save.
 */
function createHandle(onWrite?: () => void): SaveFileHandle {
    return {
        name: "bank.sf2",
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

        const after = await session.readStoredData(sample);
        expect(after.data).toBe(data.data);
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
    it("records a conversion of the mirror so undo restores the samples before older edits", async () => {
        const session = createTestSession();
        const { bank } = session.mirror;
        const sample = session.document.samples[0];
        session.history.do([
            new EditSampleAction(sample, "loopEnd", sample.loopEnd, 100)
        ]);
        const oldData = await session.readStoredData(sample);
        const mirrored = session.mirror.getSample(getObjectId(sample));
        if (!mirrored) throw new Error("The mirror has no such sample.");

        // What compressing a sample outside 8 to 96 kHz does: new data, rate and loops
        const before = captureBankFormat(bank);
        mirrored.setAudioData(new Float32Array(400), 48_000);
        mirrored.loopEnd = 200;
        const conversion = ConvertSamplesAction.between(
            bank,
            before,
            () => sample
        );
        if (!conversion) throw new Error("The conversion was not found.");
        session.history.do([conversion]);
        expect(sample).toMatchObject({ sampleRate: 48_000, loopEnd: 200 });
        expectMirrorUpToDate(session);

        session.history.undo();
        expect(await session.readStoredData(sample)).toEqual(oldData);
        expect(sample.loopEnd).toBe(100);
        expectMirrorUpToDate(session);
        session.history.undo();
        expect(sample.loopEnd).not.toBe(100);
    });

    it("writes the file from the mirror and sets the SF2 version on an SF2 save", async () => {
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

    it("is not created when nothing changed", () => {
        const { bank } = createTestSession().mirror;
        expect(
            ConvertSamplesAction.between(
                bank,
                captureBankFormat(bank),
                (s) => s
            )
        ).toBeUndefined();
    });
});
