import { describe, expect, it } from "vitest";
import { Modulator } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { SetBankInfoAction } from "./set_bank_info_action.ts";
import { SetDefaultModulatorsAction } from "./default_modulators/set_default_modulators_action.ts";

describe("SetBankInfoAction", () => {
    it("changes a text field and restores a missing one on undo", () => {
        const session = createTestSession();
        const info = session.document.bank.soundBankInfo;
        delete info.engineer;

        expectRoundTrip(session, [
            new SetBankInfoAction("engineer", undefined, "Someone")
        ]);
        expect(info.engineer).toBe("Someone");
        session.history.undo();
        expect(info.engineer).toBeUndefined();
    });

    it("changes the creation date", () => {
        const session = createTestSession();
        const info = session.document.bank.soundBankInfo;
        const date = new Date("2020-01-02T03:04:00Z");

        expectRoundTrip(session, [
            new SetBankInfoAction("creationDate", info.creationDate, date)
        ]);
        expect(info.creationDate).toBe(date);
    });
});

describe("SetDefaultModulatorsAction", () => {
    it("replaces the default modulators", () => {
        const session = createTestSession();
        const bank = session.document.bank;
        const old = bank.defaultModulators;
        const replacement = [Modulator.copyFrom(old[0])];

        expectRoundTrip(session, [
            new SetDefaultModulatorsAction(old, replacement)
        ]);
        expect(bank.defaultModulators).toEqual(replacement);
    });
});
