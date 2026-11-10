// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import toast from "react-hot-toast";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import { LayoutContext } from "../../layout/layout_context.ts";
import { BackStackContext } from "../../phone_shell/back_stack_context.ts";
import { BackStack } from "../../phone_shell/back_stack.ts";
import { PhoneShellContext } from "../../phone_shell/phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "../../phone_shell/phone_shell_state.ts";
import { createShellContext } from "../../test_utils/shell_context.ts";
import { CellSheetKeySpan } from "./cell_sheet_key_span.tsx";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

const GLOBAL: ZoneView = {
    id: 0,
    keyRange: undefined,
    velocityRange: undefined,
    generators: [],
    modulators: [],
    childId: 0
};

function renderKeySpan(isCovered: boolean) {
    const onBack = vi.fn();
    const stack = new BackStack();
    render(
        <LayoutContext value={"phone"}>
            <PhoneShellContext
                value={createShellContext({
                    ...INITIAL_PHONE_SHELL_STATE,
                    isNavigatorOpen: isCovered
                })}
            >
                <BackStackContext
                    value={{
                        stack,
                        releaseSentinel: vi.fn(),
                        dropSentinel: vi.fn()
                    }}
                >
                    <CellSheetKeySpan
                        columns={[]}
                        colorColumns={[]}
                        globalZone={GLOBAL}
                        initialSpan={undefined}
                        onCheck={vi.fn()}
                        onBack={onBack}
                    />
                </BackStackContext>
            </PhoneShellContext>
        </LayoutContext>
    );
    let isHandled = false;
    act(() => {
        isHandled = stack.handleBack();
    });
    return { isHandled, onBack };
}

describe("CellSheetKeySpan", () => {
    afterEach(cleanup);

    it("returns to the zone list on back", () => {
        const { isHandled, onBack } = renderKeySpan(false);
        expect(isHandled).toBe(true);
        expect(onBack).toHaveBeenCalledOnce();
    });

    it("leaves back to the lists while they cover the editor", () => {
        const { isHandled, onBack } = renderKeySpan(true);
        expect(isHandled).toBe(false);
        expect(onBack).not.toHaveBeenCalled();
    });

    it("keeps the checks and says so when no zone is in the span", () => {
        const onCheck = vi.fn();
        render(
            <LayoutContext value={"phone"}>
                <PhoneShellContext
                    value={createShellContext(INITIAL_PHONE_SHELL_STATE)}
                >
                    <BackStackContext
                        value={{
                            stack: new BackStack(),
                            releaseSentinel: vi.fn(),
                            dropSentinel: vi.fn()
                        }}
                    >
                        <CellSheetKeySpan
                            columns={[]}
                            colorColumns={[]}
                            globalZone={GLOBAL}
                            initialSpan={undefined}
                            onCheck={onCheck}
                            onBack={vi.fn()}
                        />
                    </BackStackContext>
                </PhoneShellContext>
            </LayoutContext>
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.checkThem"
            })
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.addToChecked"
            })
        );
        expect(onCheck).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalledTimes(2);
        expect(vi.mocked(toast).mock.calls[0][0]).toBe(
            "phoneLocale.cellSheet.noZonesInSpan"
        );
    });
});
