import { describe, expect, it, vi } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import {
    captureBankFormat,
    ConvertSamplesAction
} from "./convert_samples_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";
import type { SaveFileHandle } from "./persistence.ts";

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
        const data = sample.getStoredData().data;
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.reject(new DOMException("Cancelled", "AbortError"))
        );

        // An SF3 save compresses every sample, so this must happen after the picker
        await expect(session.save("sf3", "x")).rejects.toThrow("Cancelled");

        expect(sample.getStoredData().data).toBe(data);
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
    it("records a conversion so undo restores the samples before older edits", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const sample = session.document.samples[0];
        session.history.do([
            new EditSampleAction(sample, "loopEnd", sample.loopEnd, 100)
        ]);
        const oldData = sample.getStoredData().data;

        // What compressing a sample outside 8 to 96 kHz does: new data, rate and loops
        const before = captureBankFormat(bank);
        sample.setAudioData(new Float32Array(400), 48_000);
        sample.sampleRate = 48_000;
        sample.loopEnd = 200;
        const conversion = ConvertSamplesAction.between(bank, before);
        if (!conversion) throw new Error("The conversion was not found.");
        session.history.do([conversion]);

        session.history.undo();
        expect(sample.getStoredData().data).toBe(oldData);
        expect(sample.loopEnd).toBe(100);
        session.history.undo();
        expect(sample.loopEnd).not.toBe(100);
    });

    it("is not created when nothing changed", () => {
        const { bank } = createTestSession().document;
        expect(
            ConvertSamplesAction.between(bank, captureBankFormat(bank))
        ).toBeUndefined();
    });
});
