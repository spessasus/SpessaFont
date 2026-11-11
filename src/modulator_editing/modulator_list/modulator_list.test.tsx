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

function renderList(layout: "phone" | "desktop" = "phone", count = 1) {
    const modulators = Array.from({ length: count }, () => createModulator());
    const stack = new BackStack();
    render(
        <LayoutContext value={layout}>
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
                            isSFE={true}
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
                                isSFE={true}
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

function getActionNames() {
    return [...document.querySelectorAll(".action_buttons button")].map(
        (b) => b.textContent
    );
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

    it("shows summaries that expand into the form on a phone", () => {
        renderList("phone");
        expect(screen.queryByLabelText("modulatorLocale.amount")).toBeNull();
        const summary = document.querySelector(".modulator_summary_toggle");
        if (!summary) {
            throw new Error("No summary row.");
        }
        expect(summary.getAttribute("aria-expanded")).toBe("false");
        fireEvent.click(summary);
        expect(screen.getByLabelText("modulatorLocale.amount")).toBeTruthy();
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.modulators.done" })
        );
        expect(screen.queryByLabelText("modulatorLocale.amount")).toBeNull();
    });

    it("selects all and between from the phone action bar", () => {
        renderList("phone", 3);
        const numbers = screen.getAllByRole("button", {
            name: "modulatorLocale.modulatorNumber"
        });
        const pressedCount = () =>
            numbers.filter((n) => n.getAttribute("aria-pressed") === "true")
                .length;
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        expect(pressedCount()).toBe(3);

        // Start over with the first and the last
        fireEvent.click(numbers[1]);
        expect(pressedCount()).toBe(2);
        const between = screen.getByRole("button", {
            name: "phoneLocale.selection.between"
        });
        expect(between.getAttribute("aria-disabled")).toBeNull();
        fireEvent.click(between);
        expect(pressedCount()).toBe(3);
    });

    it("disables All on an empty list", () => {
        renderList("phone", 0);
        expect(
            screen
                .getByRole("button", { name: "phoneLocale.selection.all" })
                .getAttribute("aria-disabled")
        ).toBe("true");
    });

    it("disables Between below two selected", () => {
        renderList("phone", 3);
        const between = screen.getByRole("button", {
            name: "phoneLocale.selection.between"
        });
        expect(between.getAttribute("aria-disabled")).toBe("true");
        fireEvent.click(
            screen.getAllByRole("button", {
                name: "modulatorLocale.modulatorNumber"
            })[0]
        );
        expect(between.getAttribute("aria-disabled")).toBe("true");
    });

    it("keeps one fixed set of action buttons on a phone", () => {
        renderList("phone", 3);
        const before = getActionNames();
        expect(before).toEqual([
            // The harness has no layer header, so New stays in the bar
            "modulatorLocale.newModulator",
            "phoneLocale.selection.all",
            "phoneLocale.selection.between",
            "paste",
            "copy",
            "delete"
        ]);
        const trashButton = screen.getByRole("button", { name: "delete" });
        expect(trashButton.getAttribute("aria-disabled")).toBe("true");
        expect(
            screen
                .getByRole("button", { name: "paste" })
                .getAttribute("aria-disabled")
        ).toBe("true");
        fireEvent.click(
            screen.getAllByRole("button", {
                name: "modulatorLocale.modulatorNumber"
            })[0]
        );
        // A selection only enables, nothing moves
        expect(getActionNames()).toEqual(before);
        expect(trashButton.getAttribute("aria-disabled")).toBeNull();
    });

    it("shows the form's delete as an icon with no second number on a phone", () => {
        renderList("phone");
        const summary = document.querySelector(".modulator_summary_toggle");
        if (!summary) {
            throw new Error("No summary row.");
        }
        fireEvent.click(summary);
        expect(
            screen.getAllByRole("button", {
                name: "modulatorLocale.modulatorNumber"
            })
        ).toHaveLength(1);
        const trashButton = screen.getByRole("button", {
            name: "modulatorLocale.deleteModulator"
        });
        expect(trashButton.querySelector("svg")).not.toBeNull();
        expect(trashButton.textContent).toBe("");
    });

    it("shows Copy and Delete only with a selection on desktop", () => {
        renderList("desktop", 3);
        expect(screen.queryByRole("button", { name: "copy" })).toBeNull();
    });

    it("shows no All or Between on desktop", () => {
        renderList("desktop", 3);
        expect(
            screen.queryByRole("button", { name: "phoneLocale.selection.all" })
        ).toBeNull();
        expect(
            screen.queryByRole("button", {
                name: "phoneLocale.selection.between"
            })
        ).toBeNull();
    });

    it("hides SFE modulators in SF2 mode and keeps them when the rest is deleted", () => {
        const sfeModulator = createModulator();
        sfeModulator.destination = GeneratorTypes.amplitude;
        const modulators = [createModulator(), sfeModulator, createModulator()];
        const onChange = vi.fn();
        render(
            <LayoutContext value={"phone"}>
                <BackStackContext
                    value={{
                        stack: new BackStack(),
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
                                onModulatorListChange={onChange}
                                defaultModulators={[]}
                                isSFE={false}
                            />
                        </TranslatedOptionsContext>
                    </ClipboardContext>
                </BackStackContext>
            </LayoutContext>
        );
        expect(
            screen.getAllByRole("button", {
                name: "modulatorLocale.modulatorNumber"
            })
        ).toHaveLength(2);

        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        fireEvent.click(screen.getByRole("button", { name: "delete" }));
        expect(onChange).toHaveBeenCalledWith([sfeModulator], undefined);
    });

    it("keeps the cards on desktop", () => {
        renderList("desktop");
        expect(screen.getByLabelText("modulatorLocale.amount")).toBeTruthy();
        expect(document.querySelector(".modulator_summary_toggle")).toBeNull();
    });
});
