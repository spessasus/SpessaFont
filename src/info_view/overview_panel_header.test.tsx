// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OverviewPanelHeader } from "./overview_panel_header.tsx";
import { BackStack, BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { BackStackContext } from "../phone_shell/back_stack_context.ts";

afterEach(cleanup);

describe("OverviewPanelHeader", () => {
    it("returns to the overview on its arrow", () => {
        const onBack = vi.fn();
        render(<OverviewPanelHeader onBack={onBack} title={"Problems: 0"} />);
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.overview.back" })
        );
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("registers no back handler of its own", () => {
        const stack = new BackStack();
        render(
            <BackStackContext
                value={{
                    stack,
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <OverviewPanelHeader onBack={vi.fn()} title={"Problems: 0"} />
            </BackStackContext>
        );
        expect(stack.hasActive([BACK_LEVELS.overviewPanel])).toBe(false);
    });
});
