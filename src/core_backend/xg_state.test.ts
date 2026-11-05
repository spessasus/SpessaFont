import { describe, expect, it } from "vitest";
import { BasicPreset } from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    expectMirrorUpToDate,
    expectRoundTrip,
    expectViewsUpToDate,
    getMirror,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { EditPresetAction } from "../preset_editor/bottom_bar/edit_preset_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { BankSession } from "./bank_session.ts";

function describePresets(session: BankSession) {
    return session.document.presets.map(
        (p) => `${p.name} ${p.bankMSB}:${p.program}${p.isDrum ? " drum" : ""}`
    );
}

/**
 * Melodic presets on programs 0 and 5, and an XG drum kit (bank 127, program 0), which core's
 * own sort puts between them and the editor's puts last.
 */
function createXGSession() {
    const session = createTestSession();
    const { document } = session;
    const [a, kit] = document.presets;
    a.name = "A";
    a.program = 0;
    kit.name = "Kit";
    kit.bankMSB = 127;
    kit.program = 0;
    const c = new BasicPreset(document.bank);
    c.name = "C";
    c.program = 5;
    c.createZone(a.zones[0].instrument);
    document.presets.push(c);
    document.sortPresets();
    publishSetUp(session);
    return { session, a, kit, c };
}

describe("XG drum state", () => {
    it("puts the exact order back when a patch edit is undone", () => {
        const { session, c } = createXGSession();
        expect(session.document.bank.isXGBank).toBe(true);
        const before = describePresets(session);
        expect(before).toEqual(["A 0:0", "C 0:5", "Kit 127:0 drum"]);

        expectRoundTrip(session, [new EditPresetAction(c, "program", 5, 6)]);

        expect(describePresets(session)).toEqual([
            "A 0:0",
            "C 0:6",
            "Kit 127:0 drum"
        ]);
        session.history.undo();
        expect(describePresets(session)).toEqual(before);
    });

    it("keeps the order through a delete and its undo after an undone patch edit", () => {
        const { session, kit, c } = createXGSession();
        const before = describePresets(session);
        session.history.do([new EditPresetAction(c, "program", 5, 6)]);
        session.history.undo();

        // The only kit, so the bank stops being XG and becomes XG again
        expectRoundTrip(session, [new DeletePresetAction(kit)]);
        expect(session.document.bank.isXGBank).toBe(false);

        session.history.undo();
        expect(describePresets(session)).toEqual(before);
        expect(session.document.bank.isXGBank).toBe(true);
    });

    it("makes the mirror and the synthesizer's preset list XG too", () => {
        const testHost = createTestHost();
        const session = createTestSession(testHost);
        session.attach();
        const preset = session.document.presets[1];

        session.history.do([
            new EditPresetAction(preset, "bankMSB", preset.bankMSB, 127)
        ]);

        expect(session.document.bank.isXGBank).toBe(true);
        expect(getMirror(session).bank.isXGBank).toBe(true);
        const listed = testHost.host.processor.soundBankManager.presetList.find(
            (p) => p.bankMSB === 127
        );
        expect(listed?.isDrum).toBe(true);
        expectMirrorUpToDate(session);

        session.history.undo();
        expect(getMirror(session).bank.isXGBank).toBe(false);
    });

    it("refreshes the XG state when a deleted kit comes back", () => {
        const session = createTestSession();
        const [first] = session.document.presets;
        session.history.do([new EditPresetAction(first, "bankMSB", 0, 120)]);
        expect(session.document.bank.isXGBank).toBe(true);

        session.history.do([new DeletePresetAction(first)]);
        expect(session.document.bank.isXGBank).toBe(false);
        session.history.undo();

        expect(session.document.bank.isXGBank).toBe(true);
        expect(getMirror(session).bank.isXGBank).toBe(true);
        expectViewsUpToDate(session);
    });

    it("rebuilds the views of kits whose drum state changed with the bank's", () => {
        const { session } = createXGSession();
        const { document } = session;
        const kit = document.presets.find((p) => p.name === "Kit");
        if (!kit) {
            throw new Error("The test bank has no kit.");
        }
        const kit2 = new BasicPreset(document.bank);
        kit2.name = "Kit 2";
        kit2.bankMSB = 127;
        kit2.program = 1;
        kit2.createZone(document.presets[0].zones[0].instrument);

        session.history.do([new CreatePresetAction(kit2)]);
        const view = () =>
            session.store.getSnapshot().views.presets.get(getObjectId(kit));
        expect(view()?.isDrum).toBe(true);

        // Program 10 is not an XG drum program, so the bank stops being XG
        expectRoundTrip(session, [
            new EditPresetAction(kit2, "program", 1, 10)
        ]);
        expect(kit.isDrum).toBe(false);
        expect(view()?.isDrum).toBe(false);
        expectViewsUpToDate(session);
        expectMirrorUpToDate(session);
    });

    it("sorts the presets again when a new preset changes the XG state", () => {
        const { session, kit } = createXGSession();
        const invalid = new BasicPreset(session.document.bank);
        invalid.name = "Invalid";
        invalid.bankMSB = 120;
        // Not an XG drum program
        invalid.program = 10;

        expectRoundTrip(session, () => {
            invalid.createZone(kit.zones[0].instrument);
            return [new CreatePresetAction(invalid)];
        });

        // Not an XG bank any more, so the kit is a melodic preset on program 0
        expect(describePresets(session)).toEqual([
            "A 0:0",
            "Kit 127:0",
            "C 0:5",
            "Invalid 120:10"
        ]);
    });
});
