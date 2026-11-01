import { describe, expect, it } from "vitest";
import { Modulator } from "spessasynth_core";
import {
    createTestManager,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { SetBankInfo } from "./set_bank_info_action.ts";
import { SetDefaultModulators } from "./default_modulators/set_default_modulators_action.ts";

const noop = () => undefined;

describe("SetBankInfo", () => {
    it("changes a text field", () => {
        const manager = createTestManager();
        manager.soundBankInfo.engineer = "Original";

        expectRoundTrip(manager, [
            new SetBankInfo(noop, "Original", "Someone", "engineer")
        ]);
        expect(manager.getInfo("engineer")).toBe("Someone");
    });

    it("changes the creation date", () => {
        const manager = createTestManager();
        const date = new Date("2020-01-02T03:04:00Z");

        expectRoundTrip(manager, [
            new SetBankInfo(
                noop,
                manager.getInfo("creationDate"),
                date,
                "creationDate"
            )
        ]);
        expect(manager.getInfo("creationDate")).toBe(date);
    });
});

describe("SetDefaultModulators", () => {
    it("replaces the default modulators", () => {
        const manager = createTestManager();
        const old = manager.defaultModulators;
        const replacement = [Modulator.copyFrom(old[0])];

        expectRoundTrip(manager, [
            new SetDefaultModulators(noop, replacement, old)
        ]);
        expect(manager.defaultModulators).toEqual(replacement);
    });
});
