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
import { PhoneShellContext } from "../../phone_shell/phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "../../phone_shell/phone_shell_state.ts";
import { createShellContext } from "../../test_utils/shell_context.ts";
import { TranslatedOptionsContext } from "../../utils/translated_options/translated_options_context.ts";
import { ModulatorList } from "./modulator_list.tsx";

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn() } }));

function createModulator() {
    return new Modulator(
        new ModulatorSource(),
        new ModulatorSource(),
        GeneratorTypes.initialAttenuation,
        0,
        0
    );
}

function renderList(modulators = [createModulator()]) {
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

function renderInShell(isCoveringEditor: boolean) {
    const modulators = [createModulator(), createModulator()];
    const stack = new BackStack();
    render(
        <LayoutContext value={"phone"}>
            <PhoneShellContext
                value={createShellContext({
                    ...INITIAL_PHONE_SHELL_STATE,
                    isNavigatorOpen: isCoveringEditor
                })}
            >
                <BackStackContext
                    value={{
                        stack,
                        releaseSentinel: vi.fn(),
                        dropSentinel: vi.fn()
                    }}
                >
                    <ClipboardContext value={new ClipboardManager()}>
                        <TranslatedOptionsContext
                            value={{
                                controllers: [],
                                destinations: []
                            }}
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
            </PhoneShellContext>
        </LayoutContext>
    );
    const first = screen.getAllByRole("button", {
        name: "modulatorLocale.modulatorNumber"
    })[0];
    fireEvent.click(first);
    expect(first.getAttribute("aria-pressed")).toBe("true");
    return { stack, first };
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

    describe("with the phone shell", () => {
        it("lets back close the navigator before it ends the modulator selection", () => {
            const { stack, first } = renderInShell(true);
            let isHandled = true;
            act(() => {
                isHandled = stack.handleBack();
            });
            // Nothing in the list took it, so the shell's navigator handler gets it
            expect(isHandled).toBe(false);
            expect(first.getAttribute("aria-pressed")).toBe("true");
        });

        it("ends the modulator selection on back with the navigator closed", () => {
            const { stack, first } = renderInShell(false);
            act(() => {
                stack.handleBack();
            });
            expect(first.getAttribute("aria-pressed")).toBe("false");
        });
    });
});
