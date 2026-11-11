import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestHost,
    createTestSession,
    expectMirrorUpToDate,
    expectViewsUpToDate,
    getMirror
} from "../test_utils/bank_fixture.ts";
import { BankSession } from "./bank_session.ts";
import { loadSoundBank } from "./load_sound_bank.ts";
import { SetBankFormatAction } from "./set_bank_format_action.ts";
import type { SaveFileHandle } from "./persistence.ts";
import { resolveWriteFormat } from "./persistence.ts";
import { EditPresetAction } from "../preset_editor/bottom_bar/edit_preset_action.ts";

/**
 * Opens what the mirror of a test session writes as SFE, after `edit` changed the mirror.
 */
function openAsSFE(edit?: (session: BankSession) => void) {
    const source = createTestSession();
    edit?.(source);
    const file = getMirror(source).bank.writeSFE();
    return new BankSession(createTestHost().client, loadSoundBank(file));
}

function stubSaveFile(name: string) {
    const handle: SaveFileHandle = {
        name,
        createWritable: () =>
            Promise.resolve({
                write: () => Promise.resolve(),
                close: () => Promise.resolve()
            })
    };
    vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("detectBankFormat", () => {
    it("opens an SF2 bank in SF2 mode", () => {
        const session = createTestSession();
        expect(session.document.format).toBe("sf2");
        expect(session.store.getSnapshot().format).toBe("sf2");
    });

    it("opens an SFE file in SFE mode, even without SFE generators", () => {
        expect(openAsSFE().document.format).toBe("sfe");
    });

    it("opens a bank with SFE generators in SFE mode", () => {
        const session = openAsSFE((source) => {
            getMirror(source).bank.instruments[0].zones[0].setGenerator(
                GeneratorTypes.delayVoice,
                -1200
            );
        });
        expect(session.document.format).toBe("sfe");
    });
});

describe("SetBankFormatAction", () => {
    it("switches the format through the history and marks the bank dirty", () => {
        const session = createTestSession();
        const doFocus = session.history.do([
            new SetBankFormatAction("sf2", "sfe")
        ]);
        expect(doFocus).toBeUndefined();
        expect(session.store.getSnapshot().format).toBe("sfe");
        expect(session.history.isDirty).toBe(true);
        expect(session.history.state.undoLabel).toBe("changeFormat");
        expectViewsUpToDate(session);
        expectMirrorUpToDate(session);

        // An undo shows the overview, where the format is picked
        expect(session.history.undo()).toBe("info");
        expect(session.document.format).toBe("sf2");
        expect(session.store.getSnapshot().format).toBe("sf2");
        expect(session.history.isDirty).toBe(false);

        expect(session.history.redo()).toBe("info");
        expect(session.store.getSnapshot().format).toBe("sfe");
    });

    it("leaves SFE data in the bank when switching to SF2", () => {
        const session = openAsSFE((source) => {
            getMirror(source).bank.instruments[0].zones[0].setGenerator(
                GeneratorTypes.delayVoice,
                -1200
            );
        });
        session.history.do([new SetBankFormatAction("sfe", "sf2")]);
        const zone = session.document.instruments
            .flatMap((i) => i.zones)
            .find((z) => z.getGenerator(GeneratorTypes.delayVoice, 0) !== 0);
        expect(zone).toBeDefined();
    });
});

describe("resolveWriteFormat", () => {
    it("saves auto as SFE in SFE mode", () => {
        expect(resolveWriteFormat("auto", "sf2", "sfe")).toBe("sf4");
        expect(resolveWriteFormat("auto", "dls", "sfe")).toBe("sf4");
    });

    it("keeps the last format in SF2 mode, but not SFE", () => {
        expect(resolveWriteFormat("auto", "sf3", "sf2")).toBe("sf3");
        expect(resolveWriteFormat("auto", "dls", "sf2")).toBe("dls");
        expect(resolveWriteFormat("auto", "sf4", "sf2")).toBe("sf2");
    });

    it("writes an explicit format in either mode", () => {
        expect(resolveWriteFormat("sf2", "sf4", "sfe")).toBe("sf2");
        expect(resolveWriteFormat("sf4", "sf2", "sf2")).toBe("sf4");
    });
});

describe("saving as SFE", () => {
    it("puts the bank in SFE mode and keeps it saved", async () => {
        const session = createTestSession();
        stubSaveFile("bank.sf4");
        await session.save("sf4", "x");
        expect(session.document.format).toBe("sfe");
        expect(session.history.state.undoLabel).toBe("changeFormat");
        expect(session.history.isDirty).toBe(false);
    });

    it("leaves the format alone when the file cannot be written", async () => {
        const session = createTestSession();
        const handle: SaveFileHandle = {
            name: "bank.sf4",
            createWritable: () => Promise.reject(new Error("Disk full"))
        };
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));
        await expect(session.save("sf4", "x")).rejects.toThrow("Disk full");
        expect(session.document.format).toBe("sf2");
        expect(session.history.canUndo).toBe(false);
    });

    it("keeps an edit made while the SFE file is written unsaved", async () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const handle: SaveFileHandle = {
            name: "bank.sf4",
            createWritable: () => {
                session.history.do([
                    new EditPresetAction(preset, "program", preset.program, 5)
                ]);
                return Promise.resolve({
                    write: () => Promise.resolve(),
                    close: () => Promise.resolve()
                });
            }
        };
        vi.stubGlobal("showSaveFilePicker", () => Promise.resolve(handle));
        await session.save("sf4", "x");
        expect(session.document.format).toBe("sfe");
        expect(session.history.isDirty).toBe(true);
    });

    it("leaves the format alone for other saves", async () => {
        const session = createTestSession();
        stubSaveFile("bank.sf2");
        await session.save("sf2", "x");
        expect(session.document.format).toBe("sf2");
        expect(session.history.canUndo).toBe(false);
    });
});
