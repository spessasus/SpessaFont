// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BACK_LEVELS, BackStack } from "../phone_shell/back_stack.ts";
import { BackStackContext } from "../phone_shell/back_stack_context.ts";
import { DialogNumberField } from "./dialog_number_field.tsx";
import { ElementPicker } from "./element_picker.tsx";
import { ModalDialog } from "./modal_dialog.tsx";

const showModal = vi.fn();

beforeEach(() => {
    showModal.mockClear();
    HTMLDialogElement.prototype.showModal = showModal;
    HTMLDialogElement.prototype.close = vi.fn();
});
afterEach(cleanup);

function renderField(layout: LayoutMode, value: string, min: number) {
    return render(
        <LayoutContext value={layout}>
            <DialogNumberField
                label={"Amount"}
                value={value}
                min={min}
                max={10}
                step={1}
                onChange={vi.fn()}
            />
        </LayoutContext>
    );
}

describe("ModalDialog", () => {
    it("registers nothing without a back stack, as on desktop", () => {
        const { unmount } = render(
            <LayoutContext value={"desktop"}>
                <ModalDialog title={"Title"} className={"x"} onCancel={vi.fn()}>
                    {null}
                </ModalDialog>
            </LayoutContext>
        );
        expect(showModal).toHaveBeenCalledTimes(1);
        unmount();
    });

    it("holds a transient back handler while mounted", () => {
        const stack = new BackStack();
        const view = render(
            <BackStackContext
                value={{
                    stack,
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <LayoutContext value={"phone"}>
                    <ModalDialog
                        title={"Title"}
                        className={"x"}
                        onCancel={vi.fn()}
                    >
                        {null}
                    </ModalDialog>
                </LayoutContext>
            </BackStackContext>
        );
        expect(stack.hasActive([BACK_LEVELS.transient])).toBe(true);
        view.unmount();
        expect(stack.hasActive([BACK_LEVELS.transient])).toBe(false);
    });
});

describe("DialogNumberField", () => {
    it("asks for a decimal keypad from 0 up and for text below 0", () => {
        for (const layout of ["desktop", "phone"] as const) {
            const first = renderField(layout, "1", 0);
            expect(
                screen
                    .getByRole("spinbutton", { hidden: true })
                    .getAttribute("inputmode")
            ).toBe("decimal");
            first.unmount();
            const second = renderField(layout, "1", -12);
            expect(
                screen
                    .getByRole("spinbutton", { hidden: true })
                    .getAttribute("inputmode")
            ).toBe("text");
            second.unmount();
        }
    });

    it("explains an invalid value on a phone only", () => {
        const desktop = renderField("desktop", "abc", 0);
        expect(
            desktop.container.querySelector(".dialog_field_message")
        ).toBeNull();
        desktop.unmount();
        const phone = renderField("phone", "abc", 0);
        expect(
            phone.container.querySelector(".dialog_field_message")?.textContent
        ).toBe("phoneLocale.dialogs.invalidNumber");
        const messageId = phone.container.querySelector(
            ".dialog_field_message"
        )?.id;
        expect(
            phone.container
                .querySelector("input")
                ?.getAttribute("aria-describedby")
        ).toBe(messageId);
        phone.unmount();
        const valid = renderField("phone", "5", 0);
        expect(
            valid.container.querySelector(".dialog_field_message")
        ).toBeNull();
    });
});

describe("ElementPicker", () => {
    it("focuses the search on desktop, not on a phone", () => {
        // jsdom does not focus inside a dialog that is not open, so the calls are watched
        const focus = vi.spyOn(HTMLElement.prototype, "focus");
        const options = [0, 1, 2].map((index) => ({
            label: `Item ${index}`,
            index
        }));
        for (const layout of ["desktop", "phone"] as const) {
            focus.mockClear();
            const view = render(
                <LayoutContext value={layout}>
                    <ElementPicker
                        title={"Pick"}
                        options={options}
                        onAnswer={vi.fn()}
                    />
                </LayoutContext>
            );
            const search = screen.getByRole("combobox", { hidden: true });
            expect(focus.mock.contexts.includes(search)).toBe(
                layout === "desktop"
            );
            view.unmount();
        }
        focus.mockRestore();
    });
});
