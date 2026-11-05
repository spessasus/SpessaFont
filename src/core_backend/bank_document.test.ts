import { describe, expect, it, vi } from "vitest";
import { BasicPreset, EmptySample } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { nameSorter } from "../utils/name_sorter.ts";
import { presetSorter } from "../utils/preset_sorter.ts";

const counter = vi.hoisted(() => ({ names: 0, presets: 0 }));

vi.mock("../utils/name_sorter.ts", async (importOriginal) => {
    const original =
        await importOriginal<typeof import("../utils/name_sorter.ts")>();
    return {
        nameSorter: (...args: Parameters<typeof original.nameSorter>) => {
            counter.names++;
            return original.nameSorter(...args);
        }
    };
});

vi.mock("../utils/preset_sorter.ts", async (importOriginal) => {
    const original =
        await importOriginal<typeof import("../utils/preset_sorter.ts")>();
    return {
        presetSorter: (...args: Parameters<typeof original.presetSorter>) => {
            counter.presets++;
            return original.presetSorter(...args);
        }
    };
});

function createSamples(count: number, suffix = "") {
    return Array.from({ length: count }, (_, i) => {
        const sample = new EmptySample();
        sample.name = `B ${String(i).padStart(5, "0")}${suffix}`;
        return sample;
    });
}

describe("BankDocument", () => {
    it("adds many samples in name order without comparing each with the whole list", () => {
        const { document } = createTestSession();
        for (const sample of createSamples(2000)) {
            document.addSample(sample);
        }
        // Interleaved with the samples there, so each one goes somewhere in the middle
        const added = createSamples(1000, " copy");

        counter.names = 0;
        for (const sample of added) {
            document.addSample(sample);
        }

        // About log2 of the list per sample, a scan would need about 2,000
        expect(counter.names).toBeLessThan(added.length * 20);
        expect(document.samples).toEqual(document.samples.toSorted(nameSorter));
    });

    it("adds an equal name after the elements that have it", () => {
        const { document } = createTestSession();
        const sample = new EmptySample();
        sample.name = "Saw";

        const index = document.addSample(sample);

        expect(document.samples[index]).toBe(sample);
        expect(document.samples[index - 1].name).toBe("Saw");
    });

    it("adds many presets in patch order without sorting the list for each", () => {
        const { document } = createTestSession();
        const instrument = document.instruments[0];
        const createPresets = (count: number, bankMSB: number) =>
            Array.from({ length: count }, (_, i) => {
                const preset = new BasicPreset(document.bank);
                preset.name = `P ${i}`;
                preset.program = i % 128;
                preset.bankMSB = bankMSB;
                preset.createZone(instrument);
                return preset;
            });
        for (const preset of createPresets(1000, 1)) {
            document.addPreset(preset);
        }
        const added = createPresets(400, 2);

        counter.presets = 0;
        for (const preset of added) {
            document.addPreset(preset);
        }

        expect(counter.presets).toBeLessThan(added.length * 20);
        expect(document.presets).toEqual(
            document.presets.toSorted(presetSorter)
        );

        counter.presets = 0;
        for (const preset of added) {
            document.removePreset(preset);
        }
        expect(counter.presets).toBe(0);
    });
});
