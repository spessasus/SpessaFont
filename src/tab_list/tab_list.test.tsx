// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import { DragProvider } from "../drag_and_drop/drag_provider.tsx";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { TabList } from "./tab_list.tsx";

afterEach(cleanup);

function renderTabs(layout: LayoutMode) {
    const session = createTestSession();
    render(
        <LayoutContext value={layout}>
            <ClipboardProvider>
                <DragProvider>
                    <TabList
                        tabs={[session]}
                        activeId={session.id}
                        onSelect={() => undefined}
                        onClose={() => undefined}
                    />
                </DragProvider>
            </ClipboardProvider>
        </LayoutContext>
    );
    const close = screen.getByRole("button", { name: /^closeTab/ });
    return { session, close };
}

describe("TabList", () => {
    it("draws the close button as text on desktop", () => {
        const { session, close } = renderTabs("desktop");
        expect(close.textContent).toBe("×");
        expect(close.querySelector("svg")).toBeNull();
        session.close();
    });

    it("draws the close button as an icon on phones", () => {
        const { session, close } = renderTabs("phone");
        expect(close.textContent).toBe("");
        expect(close.querySelector("svg")).not.toBeNull();
        session.close();
    });
});
