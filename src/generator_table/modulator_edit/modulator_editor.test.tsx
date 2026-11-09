// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource
} from "spessasynth_core";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import type { BankSession } from "../../core_backend/bank_session.ts";
import { BankEditorContext } from "../../bank_editor/bank_editor_context.ts";
import { ClipboardContext } from "../../clipboard/clipboard_context.ts";
import { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { TranslatedOptionsContext } from "../../utils/translated_options/translated_options_context.ts";
import { useInstrumentView } from "../../hooks/use_instrument_view.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { ModulatorEditor } from "./modulator_editor.tsx";

afterEach(cleanup);

/**
 * The editor of the first instrument's global zone, following the store like the grid does.
 */
function GlobalModulators({ session }: { session: BankSession }) {
    const [instrument] = session.document.instruments;
    const view = useInstrumentView(session.store, getObjectId(instrument));
    if (!view) {
        return null;
    }
    return (
        <ModulatorEditor
            name={"Global"}
            column={{
                zone: view.globalZone,
                linkedZone: undefined,
                colSpan: 1,
                isStereo: false,
                name: "Global",
                sample: undefined,
                linkedSample: undefined
            }}
            onClose={vi.fn()}
            element={instrument}
            defaultModulators={[]}
        />
    );
}

function renderEditor(layout: LayoutMode, amount: number) {
    const session = createTestSession();
    const [instrument] = session.document.instruments;
    instrument.globalZone.modulators.length = 0;
    instrument.globalZone.modulators.push(
        new Modulator(
            new ModulatorSource(MIDIControllers.modulationWheel, 0, true),
            new ModulatorSource(),
            GeneratorTypes.vibLfoToPitch,
            amount,
            0
        )
    );
    publishSetUp(session);
    render(
        <LayoutContext value={layout}>
            <BankEditorContext
                value={{
                    session,
                    apply: (actions, mergeKey) =>
                        session.history.do(actions, mergeKey),
                    setView: () => undefined,
                    playSample: () => undefined
                }}
            >
                <ClipboardContext value={new ClipboardManager()}>
                    <TranslatedOptionsContext
                        value={{ controllers: [], destinations: [] }}
                    >
                        <GlobalModulators session={session} />
                    </TranslatedOptionsContext>
                </ClipboardContext>
            </BankEditorContext>
        </LayoutContext>
    );
    // Phones show the form once its summary is open
    const summary = document.querySelector(".modulator_summary_toggle");
    if (summary) {
        fireEvent.click(summary);
    }
    const readAmount = () =>
        instrument.globalZone.modulators[0].transformAmount;
    return { session, readAmount };
}

describe("ModulatorEditor amount steppers", () => {
    it("makes ten + taps on the amount one undo step", () => {
        const { session, readAmount } = renderEditor("phone", 47);
        const raise = screen.getByRole("button", {
            name: "phoneLocale.modulators.amountUp"
        });
        for (let i = 0; i < 10; i++) {
            fireEvent.click(raise);
        }
        expect(readAmount()).toBe(57);
        session.history.undo();
        expect(readAmount()).toBe(47);
        expect(session.history.canUndo).toBe(false);
        cleanup();
        session.close();
    });

    it("steps by ten with ×10 and stops at the limit", () => {
        const { session, readAmount } = renderEditor("phone", 32_760);
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.times10"
            })
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.modulators.amountUp"
            })
        );
        expect(readAmount()).toBe(32_767);
        cleanup();
        session.close();
    });

    it("shows no amount steppers on desktop", () => {
        const { session } = renderEditor("desktop", 47);
        expect(
            screen.queryByRole("button", {
                name: "phoneLocale.modulators.amountUp"
            })
        ).toBeNull();
        cleanup();
        session.close();
    });
});
