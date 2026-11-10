// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SegmentedControl } from "./segmented_control.tsx";

afterEach(cleanup);

const OPTIONS = [
    { value: "add", label: "Add" },
    { value: "multiply", label: "Multiply" },
    { value: "set", label: "Set" }
] as const;

type Mode = (typeof OPTIONS)[number]["value"];

function renderControl(value: Mode, onChange = vi.fn(), isDisabled = false) {
    render(
        <SegmentedControl<Mode>
            isDisabled={isDisabled}
            label="Mode"
            onChange={onChange}
            options={OPTIONS}
            value={value}
        />
    );
    return onChange;
}

describe("SegmentedControl", () => {
    it("is a radio group with the value checked", () => {
        renderControl("add");
        expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeTruthy();
        expect(
            screen
                .getByRole("radio", { name: "Add" })
                .getAttribute("aria-checked")
        ).toBe("true");
        expect(
            screen
                .getByRole("radio", { name: "Multiply" })
                .getAttribute("aria-checked")
        ).toBe("false");
    });

    it("calls onChange with a tapped segment", () => {
        const onChange = renderControl("add");
        fireEvent.click(screen.getByRole("radio", { name: "Multiply" }));
        expect(onChange).toHaveBeenCalledWith("multiply");
        cleanup();
        const disabled = renderControl("add", vi.fn(), true);
        const radio = screen.getByRole("radio", { name: "Multiply" });
        expect(radio.getAttribute("aria-disabled")).toBe("true");
        fireEvent.click(radio);
        expect(disabled).not.toHaveBeenCalled();
    });

    it("moves with the arrow keys and has one Tab stop", () => {
        const onChange = renderControl("add");
        const add = screen.getByRole("radio", { name: "Add" });
        expect(add.tabIndex).toBe(0);
        expect(screen.getByRole("radio", { name: "Multiply" }).tabIndex).toBe(
            -1
        );
        expect(screen.getByRole("radio", { name: "Set" }).tabIndex).toBe(-1);
        fireEvent.keyDown(add, { key: "ArrowRight" });
        expect(onChange).toHaveBeenLastCalledWith("multiply");
        expect(document.activeElement).toBe(
            screen.getByRole("radio", { name: "Multiply" })
        );
        cleanup();
        const second = renderControl("set");
        fireEvent.keyDown(screen.getByRole("radio", { name: "Set" }), {
            key: "ArrowLeft"
        });
        expect(second).toHaveBeenLastCalledWith("multiply");
        fireEvent.keyDown(screen.getByRole("radio", { name: "Set" }), {
            key: "ArrowRight"
        });
        expect(second).toHaveBeenLastCalledWith("add");
    });
});
