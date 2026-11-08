// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { ElementBar } from "./element_bar.tsx";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

function renderBar(
    pick: (session: ReturnType<typeof createTestSession>) => BankEditView
) {
    const session = createTestSession();
    const view = pick(session);
    const result = render(
        <LayoutContext value="phone">
            <BackStackProvider>
                <BankEditorContext
                    value={{
                        session,
                        apply: (actions) => session.history.do(actions),
                        setView: () => undefined,
                        playSample: () => undefined
                    }}
                >
                    <ElementBar view={view} />
                </BankEditorContext>
            </BackStackProvider>
        </LayoutContext>
    );
    return { session, ...result };
}

describe("ElementBar", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("opens the preset properties", () => {
        const { session } = renderBar((s) => s.document.presets[0]);
        fireEvent.click(screen.getByRole("button"));
        const dialog = screen.getByRole("dialog");
        expect(
            dialog.querySelector("input[aria-label='presetLocale.presetName']")
        ).not.toBeNull();
        session.close();
    });

    it("has no button on the overview", () => {
        const { session } = renderBar(() => "info");
        expect(screen.queryByRole("button")).toBeNull();
        session.close();
    });
});
