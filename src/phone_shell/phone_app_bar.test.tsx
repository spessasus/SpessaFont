// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { PhoneAppBar } from "./phone_app_bar.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";
import { createShellContext } from "../test_utils/shell_context.ts";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

function renderBar(isLandscape = false) {
    const session = createTestSession();
    const dispatch = vi.fn();
    const onViewChange = vi.fn();
    const result = render(
        <PhoneShellContext
            value={createShellContext(
                INITIAL_PHONE_SHELL_STATE,
                dispatch,
                isLandscape
            )}
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

    it("drops the lists button and the subtitle in landscape", () => {
        const { session, container, queryByLabelText } = renderBar(true);
        expect(queryByLabelText("phoneLocale.appBar.openLists")).toBeNull();
        expect(container.querySelector(".phone_app_bar_subtitle")).toBeNull();
        session.close();
    });

    it("marks a dirty bank after the title in landscape", () => {
        const { session, getByRole, getByText } = renderBar(true);
        act(() => {
            session.history.do([
                new SetBankInfoAction(
                    "name",
                    session.document.bank.soundBankInfo.name,
                    "Renamed"
                )
            ]);
        });
        const title = getByRole("button", { name: /presetList.overview/ });
        expect(title.textContent).toContain("phoneLocale.appBar.unsaved");
        // After the title itself, as there is no subtitle line to hold it
        expect(
            getByText("phoneLocale.appBar.unsaved").closest(
                ".phone_app_bar_subtitle"
            )
        ).toBeNull();
        session.close();
    });

    it("expands the collapsed dock from the title in landscape", () => {
        const session = createTestSession();
        const dispatch = vi.fn();
        const { getByRole } = render(
            <PhoneShellContext
                value={createShellContext(
                    {
                        ...INITIAL_PHONE_SHELL_STATE,
                        isNavigatorCollapsed: true
                    },
                    dispatch,
                    true
                )}
            >
                <PhoneAppBar
                    session={session}
                    view={"info"}
                    onViewChange={vi.fn()}
                    toolsSlotRef={() => undefined}
                    isCovered={false}
                    overflow={null}
                />
            </PhoneShellContext>
        );
        fireEvent.click(getByRole("button", { name: /presetList.overview/ }));
        expect(dispatch).toHaveBeenCalledWith({ type: "toggleCollapsed" });
        session.close();
    });
});
