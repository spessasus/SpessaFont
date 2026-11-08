// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { BottomSheet } from "./bottom_sheet.tsx";

function renderSheet(onClose: () => void) {
    return render(
        <LayoutContext value="phone">
            <BackStackProvider>
                <BottomSheet title="Menu" onClose={onClose}>
                    <button type="button">First</button>
                    <button type="button">Second</button>
                </BottomSheet>
            </BackStackProvider>
        </LayoutContext>
    );
}

describe("BottomSheet", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("closes on the scrim, the close button, Escape and back", () => {
        const onClose = vi.fn();
        renderSheet(onClose);

        const scrim = document.querySelector(".bottom_sheet_scrim");
        if (!(scrim instanceof HTMLElement)) {
            throw new TypeError("No scrim");
        }
        fireEvent.click(scrim);
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByLabelText("menuBarLocale.file.close"));
        expect(onClose).toHaveBeenCalledTimes(2);

        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(3);

        fakeHistory.pressBack();
        expect(onClose).toHaveBeenCalledTimes(4);
    });

    it("focuses its first button and returns the focus on unmount", () => {
        const opener = document.createElement("button");
        document.body.append(opener);
        opener.focus();

        const { unmount } = renderSheet(vi.fn());
        expect(document.activeElement).toBe(screen.getByText("First"));
        unmount();
        expect(document.activeElement).toBe(opener);
        opener.remove();
    });
});
