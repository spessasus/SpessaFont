// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import toast from "react-hot-toast";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { ELEMENT_LIST_SCOPE } from "../utils/is_editor_shortcut.ts";
import { useMenuShortcuts } from "./use_menu_shortcuts.ts";

afterEach(() => {
    cleanup();
    toast.remove();
});

interface ShortcutsProps {
    view: BankEditView;
}

function Shortcuts({ view }: ShortcutsProps) {
    useMenuShortcuts(view === "info" ? new Set() : new Set([view]), false);
    return (
        <>
            <div {...ELEMENT_LIST_SCOPE}>
                <button type={"button"} id={"row"}>
                    {"row"}
                </button>
            </div>
            <button type={"button"} id={"editor"}>
                {"zone header"}
            </button>
            <div role={"menu"}>
                <button type={"button"} id={"menu_item"}>
                    {"Delete"}
                </button>
            </div>
        </>
    );
}

interface HarnessProps {
    session: BankSession;
}

/**
 * Shows the first preset, and the neighbor a delete focuses, like the bank editor does.
 */
function Harness({ session }: HarnessProps) {
    const [view, setView] = useState<BankEditView>(session.document.presets[0]);
    const context = {
        session,
        setView,
        apply: (actions: HistoryActionGroup) => {
            const focus = session.history.do(actions);
            if (focus) setView(focus);
        },
        playSample: () => undefined
    };
    return (
        <ClipboardProvider>
            <BankEditorContext value={context}>
                <Shortcuts view={view} />
            </BankEditorContext>
        </ClipboardProvider>
    );
}

function pressDelete(target: Element, isRepeat = false) {
    act(() => {
        fireEvent.keyDown(target, { key: "Delete", repeat: isRepeat });
    });
}

function byId(id: string) {
    const element = document.querySelector(`#${id}`);
    if (!element) {
        throw new Error(`#${id} did not render.`);
    }
    return element;
}

describe("useMenuShortcuts", () => {
    it("deletes once for a held Delete, not the neighbor shown after it too", () => {
        const session = createTestSession();
        const before = session.document.presets.length;
        render(<Harness session={session} />);
        pressDelete(document.body);
        // Key repeats of the same press, each rendered before the next as in a browser
        for (let i = 0; i < 4; i++) {
            pressDelete(document.body, true);
        }
        expect(session.document.presets.length).toBe(before - 1);
    });

    it("deletes with the focus in the element list", () => {
        const session = createTestSession();
        const before = session.document.presets.length;
        render(<Harness session={session} />);
        pressDelete(byId("row"));
        expect(session.document.presets.length).toBe(before - 1);
    });

    it("leaves Delete in the editors alone, so it does not delete the shown element", () => {
        const session = createTestSession();
        const before = session.document.presets.length;
        render(<Harness session={session} />);
        pressDelete(byId("editor"));
        expect(session.document.presets.length).toBe(before);
    });

    it("leaves Delete in an open context menu alone", () => {
        const session = createTestSession();
        const before = session.document.presets.length;
        render(<Harness session={session} />);
        pressDelete(byId("menu_item"));
        expect(session.document.presets.length).toBe(before);
    });
});
