// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { PhoneAppBar } from "./phone_app_bar.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

function renderBar() {
    const session = createTestSession();
    const dispatch = vi.fn();
    const onViewChange = vi.fn();
    const result = render(
        <PhoneShellContext
            value={{ state: INITIAL_PHONE_SHELL_STATE, dispatch }}
        >
            <PhoneAppBar
                session={session}
                view={"info"}
                onViewChange={onViewChange}
                toolsSlotRef={() => undefined}
                isCovered={false}
                overflow={<button type="button">overflow</button>}
            />
        </PhoneShellContext>
    );
    return { session, dispatch, onViewChange, ...result };
}

describe("PhoneAppBar", () => {
    afterEach(cleanup);

    it("names undo after the last action and marks the bank dirty", () => {
        const { session, container, getByLabelText } = renderBar();
        const subtitle = container.querySelector(".phone_app_bar_subtitle");
        expect(subtitle?.textContent).not.toContain("•");
        act(() => {
            session.history.do([
                new SetBankInfoAction(
                    "name",
                    session.document.bank.soundBankInfo.name,
                    "Renamed"
                )
            ]);
        });
        expect(subtitle?.textContent?.startsWith("Renamed")).toBe(true);
        expect(subtitle?.textContent).toContain("•");
        expect(
            getByLabelText("menuBarLocale.edit.undoWhat").getAttribute(
                "aria-disabled"
            )
        ).toBe("false");
        session.close();
    });

    it("opens the navigator from the menu button and the title", () => {
        const { session, dispatch, getByLabelText, getByRole } = renderBar();
        fireEvent.click(getByLabelText("phoneLocale.appBar.openLists"));
        fireEvent.click(getByRole("button", { name: /presetList.overview/ }));
        expect(dispatch).toHaveBeenCalledTimes(2);
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: "openNavigator" });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: "openNavigator" });
        session.close();
    });
});
