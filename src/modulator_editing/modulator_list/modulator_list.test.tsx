// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import { GeneratorTypes, Modulator, ModulatorSource } from "spessasynth_core";
import { buildModulatorView } from "../../core_backend/entity_views.ts";
import { ClipboardContext } from "../../clipboard/clipboard_context.ts";
import { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { LayoutContext } from "../../layout/layout_context.ts";
import { BackStackContext } from "../../phone_shell/back_stack_context.ts";
import { BackStack } from "../../phone_shell/back_stack.ts";
import { TranslatedOptionsContext } from "../../utils/translated_options/translated_options_context.ts";
import { ModulatorList } from "./modulator_list.tsx";

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn() } }));

function renderList() {
    const modulators = [
        new Modulator(
            new ModulatorSource(),
            new ModulatorSource(),
            GeneratorTypes.initialAttenuation,
            0,
            0
        )
    ];
    const stack = new BackStack();
    render(
        <LayoutContext value={"phone"}>
            <BackStackContext
                value={{
                    stack,
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <ClipboardContext value={new ClipboardManager()}>
                    <TranslatedOptionsContext
                        value={{ controllers: [], destinations: [] }}
                    >
                        <ModulatorList
                            modulatorList={modulators.map((m) =>
                                buildModulatorView(m)
                            )}
                            getModulators={() => modulators}
                            onModulatorListChange={vi.fn()}
                            defaultModulators={[]}
                        />
                    </TranslatedOptionsContext>
                </ClipboardContext>
            </BackStackContext>
        </LayoutContext>
    );
    return stack;
}

describe("ModulatorList", () => {
    afterEach(cleanup);

    it("ends the selection on a phone's back press before anything else", () => {
        const stack = renderList();
        const numberButton = screen.getByRole("button", {
            name: "modulatorLocale.modulatorNumber"
        });
        expect(stack.handleBack()).toBe(false);

        fireEvent.click(numberButton);
        expect(numberButton.getAttribute("aria-pressed")).toBe("true");

        let isHandled = false;
        act(() => {
            isHandled = stack.handleBack();
        });
        expect(isHandled).toBe(true);
        expect(numberButton.getAttribute("aria-pressed")).toBe("false");
        // The selection is gone, so the next press goes to the layer behind it
        expect(stack.handleBack()).toBe(false);
    });
});
