// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import toast from "react-hot-toast";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { useSaveBank } from "./use_save_bank.ts";

vi.mock(
    "../core_backend/encode_vorbis.ts",
    () => import("../test_utils/test_vorbis.ts")
);
vi.mock("../toasts/show_toast_dialog.tsx", () => ({
    showToastDialog: vi.fn(() => "question")
}));

function createHandle(name: string) {
    return {
        name,
        createWritable: () =>
            Promise.resolve({
                write: () => Promise.resolve(),
                close: () => Promise.resolve()
            })
    };
}

describe("useSaveBank", () => {
    it("asks once per bank, and closing the bank takes the question away", async () => {
        const session = createTestSession();
        session.document.bank.soundBankInfo.name = "Żaba";
        const picker = vi.fn(() => Promise.resolve(createHandle("bank.sf2")));
        vi.stubGlobal("showSaveFilePicker", picker);
        const dismiss = vi.spyOn(toast, "dismiss");
        const { result } = renderHook(() => useSaveBank());

        const first = result.current(session, "sf2");
        expect(await result.current(session, "sf2")).toBe("canceled");
        expect(showToastDialog).toHaveBeenCalledTimes(1);

        session.close();
        expect(await first).toBe("canceled");
        expect(dismiss).toHaveBeenCalledWith("question");
        expect(picker).not.toHaveBeenCalled();
    });

    it("warns about compressed samples on an SF2 save after an SF3 save", async () => {
        const session = createTestSession();
        vi.stubGlobal("showSaveFilePicker", () =>
            Promise.resolve(createHandle("bank.sf3"))
        );
        await session.save("sf3", "x");
        vi.mocked(showToastDialog).mockClear();
        const { result } = renderHook(() => useSaveBank());

        void result.current(session, "sf2");

        expect(showToastDialog).toHaveBeenCalledWith(
            expect.objectContaining({
                content: "menuBarLocale.file.warnSF2"
            })
        );
        session.close();
    });
});
