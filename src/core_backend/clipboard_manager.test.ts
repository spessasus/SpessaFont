import { describe, expect, it, vi } from "vitest";
import { BasicPreset, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { ClipboardManager } from "./clipboard_manager.ts";

describe("ClipboardManager", () => {
    it("pastes presets with their instruments and samples into another bank", () => {
        const source = createTestSession();
        const target = createTestSession();
        const clipboard = new ClipboardManager();
        clipboard.copyPresets(new Set([source.document.presets[0]]), source);

        const { after } = expectRoundTrip(target, () =>
            clipboard.pastePresets(target)
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
        clipboard.copySamples(new Set([session.document.samples[0]]), session);

        const { after } = expectRoundTrip(session, () =>
            clipboard.pasteSamples(session)
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
        publishSetUp(session);
        const clipboard = new ClipboardManager();

        const { after } = expectRoundTrip(session, () =>
            clipboard.cloneSamples(session, [left])
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
            clipboard.cloneInstruments(session, [instrument])
        );

        expect(after.instruments).toHaveLength(3);
        expect(after.samples).toHaveLength(2);
    });

    it("returns no actions when nothing is copied", () => {
        const session = createTestSession();
        expect(new ClipboardManager().pasteSamples(session)).toEqual([]);
    });

    it("notifies subscribers and replaces the snapshot on every copy", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        const listener = vi.fn();
        const unsubscribe = clipboard.subscribe(listener);
        const empty = clipboard.getSnapshot();
        expect(clipboard.getSnapshot()).toBe(empty);

        clipboard.copySamples(new Set(session.document.samples), session);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(clipboard.getSnapshot()).toEqual({
            presets: 0,
            instruments: 0,
            samples: 2,
            modulators: 0
        });

        // Copying elements of another kind replaces them, modulators are separate
        clipboard.copyPresets(new Set([session.document.presets[0]]), session);
        clipboard.copyModulators(
            session.document.presets[0].globalZone.modulators
        );
        expect(clipboard.getSnapshot()).toMatchObject({
            presets: 1,
            samples: 0
        });

        unsubscribe();
        clipboard.copyInstruments(
            new Set(session.document.instruments),
            session
        );
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it("keeps its own copy of the copied selection", () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        const selection = new Set([session.document.samples[0]]);
        clipboard.copySamples(selection, session);

        selection.add(session.document.samples[1]);

        expect(clipboard.sampleCount).toBe(1);
    });

    it("finds a free patch in the next bank when the preset's bank is full", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const [preset] = session.document.presets;
        // Take every program of bank 0 with copies of the preset
        const copies = new Array<BasicPreset>();
        for (let program = 0; program < 128; program++) {
            const copy = new BasicPreset(bank);
            copy.name = `P${program}`;
            copy.program = program;
            copies.push(copy);
        }
        bank.presets.push(...copies);

        const [action] = new ClipboardManager().clonePresets(session, [preset]);
        session.history.do([action]);

        const pasted = session.document.presets.find(
            (p) => p.bankMSB === 1 && p.program === 0
        );
        expect(pasted?.name).toBe(preset.name);
    });

    it("moves a drum kit to the next bank when every drum program is taken", () => {
        const session = createTestSession();
        const { bank } = session.document;
        const kits = new Array<BasicPreset>();
        for (let program = 0; program < 128; program++) {
            const kit = new BasicPreset(bank);
            kit.name = `Kit ${program}`;
            kit.program = program;
            kit.isGMGSDrum = true;
            kits.push(kit);
        }
        bank.presets.push(...kits);

        const [action] = new ClipboardManager().clonePresets(session, [
            kits[0]
        ]);
        session.history.do([action]);

        const pasted = session.document.presets.find(
            (p) => p.isGMGSDrum && p.bankMSB === 1 && p.program === 0
        );
        expect(pasted?.name).toBe("Kit 0");
    });

    it("gives a sample pasted into another bank the data from the source's mirror", async () => {
        const source = createTestSession();
        const target = createTestSession();
        const [original] = source.document.samples;
        original.setAudioData(new Float32Array([0.1, 0.2, 0.3]), 44_100);
        publishSetUp(source);
        const clipboard = new ClipboardManager();
        clipboard.copySamples(new Set([original]), source);
        // The editor's sample has other data, so only a copy between mirrors passes
        original.setAudioData(new Float32Array(3), 44_100);

        target.history.do(clipboard.pasteSamples(target));

        const pasted = target.document.samples.find((s) => s.name === "Saw-1");
        if (!pasted) throw new Error("The sample was not pasted.");
        expect([...(await target.readAudio(pasted))]).toEqual([
            ...(await source.readAudio(original))
        ]);
    });

    it("gives the samples of a duplicated preset's new instrument the source's data", async () => {
        const session = createTestSession();
        const clipboard = new ClipboardManager();
        // A preset from the other bank brings an instrument and a sample with new names
        const other = createTestSession();
        const [preset] = other.document.presets;
        const sample = preset.zones[0].instrument.zones[0].sample;
        sample.setAudioData(new Float32Array([0.5, -0.5]), 44_100);
        sample.name = "Unique";
        preset.zones[0].instrument.name = "Unique Instrument";
        publishSetUp(other);

        session.history.do(clipboard.clonePresets(session, [preset], other));

        const copy = session.document.samples.find((s) => s.name === "Unique");
        if (!copy) throw new Error("The sample was not copied.");
        expect([...(await session.readAudio(copy))]).toEqual([0.5, -0.5]);
    });
});
