import { describe, expect, it } from "vitest";
import { createTestManager, snapshotBank } from "./bank_fixture.ts";

describe("createTestManager", () => {
    it("holds two copies of the sample bank", () => {
        const snapshot = snapshotBank(createTestManager());
        expect(snapshot.presets.map((p) => p.name)).toEqual([
            "Saw Wave",
            "Saw Wave 2"
        ]);
        expect(snapshot.instruments.map((i) => i.name)).toEqual([
            "Saw Wave",
            "Saw Wave 2"
        ]);
        expect(snapshot.samples.map((s) => s.name)).toEqual(["Saw", "Saw 2"]);
    });
});
