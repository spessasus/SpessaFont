import { describe, expect, it, vi } from "vitest";
import { SampleTypes } from "spessasynth_core";
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

    it("duplicates a stereo half as a new pair and leaves the original pair alone", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        const clipboard = new ClipboardManager();

        const { after } = expectRoundTrip(session, () =>
            clipboard.cloneSamples(session.document, [left])
        );

        expect(left.linkedSample).toBe(right);
        expect(right.linkedSample).toBe(left);
        expect(after.samples).toHaveLength(4);
        const copy = session.document.samples.find((s) => s.name === "Saw-1");
        expect(copy?.linkedSample?.name).toBe("Saw 2-1");
        expect(copy?.linkedSample?.sampleType).toBe(SampleTypes.rightSample);
    });

    it("duplicates an instrument and shares its samples", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        const [instrument] = session.document.instruments;

        const { after } = expectRoundTrip(session, () =>
            clipboard.cloneInstruments(session.document, [instrument])
        );

        expect(after.instruments).toHaveLength(3);
        expect(after.samples).toHaveLength(2);
    });

    it("returns no actions when nothing is copied", () => {
        const session = createTestSession();
        expect(new ClipboardManager().pasteSamples(session.document)).toEqual(
            []
        );
    });

    it("notifies subscribers and replaces the snapshot on every copy", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        const listener = vi.fn();
        const unsubscribe = clipboard.subscribe(listener);
        const empty = clipboard.getSnapshot();
        expect(clipboard.getSnapshot()).toBe(empty);

        clipboard.copySamples(new Set(session.document.samples));
        expect(listener).toHaveBeenCalledTimes(1);
        expect(clipboard.getSnapshot()).toEqual({
            presets: 0,
            instruments: 0,
            samples: 2,
            modulators: 0
        });

        // Copying elements of another kind replaces them, modulators are separate
        clipboard.copyPresets(new Set([session.document.presets[0]]));
        clipboard.copyModulators(
            session.document.presets[0].globalZone.modulators
        );
        expect(clipboard.getSnapshot()).toMatchObject({
            presets: 1,
            samples: 0
        });

        unsubscribe();
        clipboard.copyInstruments(new Set(session.document.instruments));
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it("keeps its own copy of the copied selection", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        const selection = new Set([session.document.samples[0]]);
        clipboard.copySamples(selection);

        selection.add(session.document.samples[1]);

        expect(clipboard.sampleCount).toBe(1);
    });
});
