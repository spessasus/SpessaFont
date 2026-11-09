// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { EditableInfo } from "./editable_info.tsx";

afterEach(cleanup);

function renderInfo(layout: LayoutMode) {
    const session = createTestSession();
    return render(
        <LayoutContext value={layout}>
            <BankEditorContext
                value={{
                    session,
                    setView: vi.fn(),
                    apply: vi.fn(),
                    playSample: vi.fn()
                }}
            >
                <EditableInfo />
            </BankEditorContext>
        </LayoutContext>
    );
}

describe("EditableInfo", () => {
    it("labels the name and the description on a phone", () => {
        const { container } = renderInfo("phone");
        expect(container.querySelector('label[for="INAM"]')).not.toBeNull();
        expect(container.querySelector('label[for="ICMT"]')).not.toBeNull();
    });

    it("keeps the desktop fields without visible labels", () => {
        const { container } = renderInfo("desktop");
        expect(container.querySelector('label[for="INAM"]')).toBeNull();
        expect(container.querySelector('label[for="ICMT"]')).toBeNull();
    });
});
