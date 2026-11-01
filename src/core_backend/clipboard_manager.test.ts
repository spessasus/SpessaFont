import { describe, expect, it } from "vitest";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { ClipboardManager } from "./clipboard_manager.ts";

describe("ClipboardManager", () => {
    it("pastes presets with their instruments and samples into another bank", () => {
        const source = createTestSession();
        const target = createTestSession();
        const clipboard = new ClipboardManager();
        clipboard.copyPresets(new Set([source.document.presets[0]]));

        const { after } = expectRoundTrip(target, () =>
            clipboard.pastePresets(target.document)
        );

        expect(after.presets).toHaveLength(3);
        // Both presets of the test bank use patch 000:000:000, so the pasted one moves to a free patch
        const pasted = target.document.presets.find(
            (p) => p.program !== 0 || p.bankMSB !== 0 || p.bankLSB !== 0
        );
        if (!pasted) throw new Error("The preset was not pasted.");
        expect(pasted.zones[0].instrument.linkedTo).toContain(pasted);
        // Instruments and samples with the same name are reused instead of duplicated
        expect(target.document.instruments).toHaveLength(2);
    });

    it("pastes samples with unique names", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        clipboard.copySamples(new Set([session.document.samples[0]]));

        const { after } = expectRoundTrip(session, () =>
            clipboard.pasteSamples(session.document)
        );

        expect(after.samples.map((s) => s.name)).toEqual([
            "Saw",
            "Saw 2",
            "Saw-1"
        ]);
    });

    it("returns no actions when nothing is copied", () => {
        const session = createTestSession();
        expect(new ClipboardManager().pasteSamples(session.document)).toEqual(
            []
        );
    });
});
