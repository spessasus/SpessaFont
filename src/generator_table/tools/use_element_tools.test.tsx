// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import toast from "react-hot-toast";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { BankEditorContext } from "../../bank_editor/bank_editor_context.ts";
import {
    type DialogsAPI,
    DialogsContext
} from "../../dialogs/dialogs_context.ts";
import type { showToastDialog } from "../../toasts/show_toast_dialog.tsx";
import { DeletePresetAction } from "../../preset_editor/bottom_bar/delete_preset_action.ts";
import { DeleteInstrumentAction } from "../../instrument_editor/linked_presets/delete_instrument_action.ts";
import { useElementTools } from "./use_element_tools.tsx";

const shown = vi.hoisted(
    () => new Array<Parameters<typeof showToastDialog>[0]>()
);
vi.mock("../../toasts/show_toast_dialog.tsx", () => ({
    showToastDialog: (options: Parameters<typeof showToastDialog>[0]) => {
        shown.push(options);
        return `toast ${shown.length}`;
    }
}));

const DIALOGS: DialogsAPI = {
    pickElement: () => Promise.resolve(undefined),
    askNumber: () => Promise.resolve(undefined),
    openDialog: () => Promise.resolve(undefined)
};

function renderTools(session: ReturnType<typeof createTestSession>) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <BankEditorContext.Provider
            value={{
                session,
                apply: (actions) => {
                    session.history.do(actions);
                },
                setView: () => undefined,
                playSample: () => undefined
            }}
        >
            <DialogsContext.Provider value={DIALOGS}>
                {children}
            </DialogsContext.Provider>
        </BankEditorContext.Provider>
    );
    return renderHook(() => useElementTools(), { wrapper });
}

describe("useElementTools split", () => {
    it("checks the bank again when the confirmation is answered, and closes it on unmount", () => {
        shown.length = 0;
        const dismiss = vi.spyOn(toast, "dismiss");
        const session = createTestSession();
        const { document } = session;
        const [instrument] = document.instruments;
        const [sample] = document.samples;
        // Four full range zones split by key make 512, which asks first
        instrument.createZone(sample);
        instrument.createZone(sample);
        for (const zone of instrument.zones) {
            zone.keyRange = { min: 0, max: 127 };
        }
        publishSetUp(session);
        const { result, unmount } = renderTools(session);

        act(() => result.current.split([instrument], { mode: "key", step: 1 }));
        expect(shown).toHaveLength(1);

        // The instrument goes while the toast is open
        const preset = document.presets.find((p) =>
            p.zones.some((z) => z.instrument === instrument)
        );
        if (preset) {
            session.history.do([new DeletePresetAction(preset)]);
        }
        session.history.do([new DeleteInstrumentAction(instrument)]);
        act(() => shown[0].buttons[0].onClick?.());

        expect(instrument.zones).toHaveLength(4);
        expect(
            sample.linkedTo.filter((i) => !document.instruments.includes(i))
        ).toEqual([]);

        unmount();
        expect(dismiss).toHaveBeenCalledWith("toast 1");
    });
});
