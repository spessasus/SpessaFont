// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { useLeaveFlow } from "./use_leave_flow.ts";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));
vi.mock("../toasts/show_toast_dialog.tsx", () => ({
    showToastDialog: vi.fn(() => "phone-leave")
}));

function PhoneWrapper({ children }: { children: ReactNode }) {
    return (
        <LayoutContext value={"phone"}>
            <BackStackProvider>{children}</BackStackProvider>
        </LayoutContext>
    );
}

describe("useLeaveFlow", () => {
    let fakeHistory: FakeHistory;
    const sessions = new Array<BankSession>();
    const openSession = () => {
        const session = createTestSession();
        sessions.push(session);
        return session;
    };
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
        vi.mocked(toast).mockClear();
        vi.mocked(showToastDialog).mockClear();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
        for (const session of sessions.splice(0)) {
            session.close();
        }
    });

    it("toasts and releases the sentinel when nothing is unsaved", () => {
        const tabs = [openSession()];
        renderHook(() => useLeaveFlow(tabs), { wrapper: PhoneWrapper });

        fakeHistory.pressBack();
        expect(toast).toHaveBeenCalledWith("phoneLocale.back.pressAgain", {
            id: "phone-leave"
        });
        expect(showToastDialog).not.toHaveBeenCalled();
        // Only the first tap pushed it, the back press left it off
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(1);
        expect(fakeHistory.back).not.toHaveBeenCalled();
    });

    it("asks with Leave and Stay when a bank is dirty, and Leave drops the sentinel", () => {
        const session = openSession();
        const tabs = [openSession(), session];
        renderHook(() => useLeaveFlow(tabs), { wrapper: PhoneWrapper });
        // After the render, so a value read while rendering would be stale
        act(() => {
            session.history.do([
                new SetBankInfoAction(
                    "name",
                    session.document.bank.soundBankInfo.name,
                    "Renamed"
                )
            ]);
        });

        fakeHistory.pressBack();
        expect(toast).not.toHaveBeenCalled();
        expect(showToastDialog).toHaveBeenCalledTimes(1);
        const options = vi.mocked(showToastDialog).mock.calls[0]?.[0];
        expect(options?.id).toBe("phone-leave");
        expect(options?.content).toBe("phoneLocale.back.unsavedBanks");
        expect(options?.buttons.map((button) => button.label)).toEqual([
            "phoneLocale.back.leave",
            "phoneLocale.back.stay"
        ]);
        // The sentinel is back, so Stay needs nothing more
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(2);

        act(() => {
            options?.buttons[0]?.onClick?.();
        });
        expect(fakeHistory.back).toHaveBeenCalledTimes(1);
        expect(toast).toHaveBeenCalledWith("phoneLocale.back.pressAgain", {
            id: "phone-leave"
        });
    });
});
