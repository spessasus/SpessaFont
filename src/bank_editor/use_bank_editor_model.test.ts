// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { useBankEditorModel } from "./use_bank_editor_model.ts";

describe("useBankEditorModel", () => {
    it("falls back to the overview when the shown element leaves the bank", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const onViewChange = vi.fn();
        const { result } = renderHook(() =>
            useBankEditorModel(session, preset, onViewChange)
        );
        expect(result.current.view).toBe(preset);

        act(() => {
            session.history.do([new DeletePresetAction(preset)]);
        });

        expect(result.current.view).toBe("info");
    });

    it("routes playSample through onViewChange and counts the request", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        const onViewChange = vi.fn();
        // The parent shows the sample in the same batch, so it is the shown view already
        const { result } = renderHook(() =>
            useBankEditorModel(session, sample, onViewChange)
        );
        expect(result.current.playRequest).toBe(0);

        act(() => {
            result.current.context.playSample(sample);
        });

        expect(onViewChange).toHaveBeenCalledWith(sample);
        expect(result.current.playRequest).toBe(1);
        expect(result.current.samplePlayerState).toBe("playing");
    });

    it("titles the document after the bank and restores the title", () => {
        const session = createTestSession();
        session.document.bank.soundBankInfo.name = "Żaba";
        publishSetUp(session);
        document.title = "Before";
        const { unmount } = renderHook(() =>
            useBankEditorModel(session, "info", vi.fn())
        );
        expect(document.title).toBe("SpessaFont - Żaba");

        unmount();

        expect(document.title).toBe("Before");
    });
});
