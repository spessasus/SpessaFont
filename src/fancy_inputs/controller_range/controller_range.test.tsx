// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ControllerRange } from "./controller_range.tsx";

function renderRange(hasCommit = true) {
    const onChange = vi.fn<(value: number) => void>();
    const onCommit = vi.fn<(value: number) => void>();
    const onCancel = vi.fn<() => void>();
    render(
        <ControllerRange
            min={0}
            max={100}
            value={50}
            onChange={onChange}
            onCommit={hasCommit ? onCommit : undefined}
            onCancel={hasCommit ? onCancel : undefined}
            ariaLabel={"Range"}
        />
    );
    return {
        input: screen.getByRole<HTMLInputElement>("slider"),
        onChange,
        onCommit,
        onCancel
    };
}

describe("ControllerRange", () => {
    afterEach(cleanup);

    it("calls onChange per move and onCommit once on release", () => {
        const { input, onChange, onCommit } = renderRange();
        fireEvent.pointerDown(input, { pointerId: 1 });
        for (const value of ["60", "70", "80"]) {
            fireEvent.change(input, { target: { value } });
        }
        expect(onCommit).not.toHaveBeenCalled();
        fireEvent.pointerUp(input, { pointerId: 1 });
        expect(onChange.mock.calls).toEqual([[60], [70], [80]]);
        expect(onCommit).toHaveBeenCalledExactlyOnceWith(80);
    });

    it("calls onCommit after an arrow key", () => {
        const { input, onCommit } = renderRange();
        fireEvent.keyDown(input, { key: "ArrowRight" });
        fireEvent.change(input, { target: { value: "51" } });
        fireEvent.keyUp(input, { key: "ArrowRight" });
        expect(onCommit).toHaveBeenCalledExactlyOnceWith(51);
        fireEvent.keyUp(input, { key: "a" });
        expect(onCommit).toHaveBeenCalledOnce();
    });

    it("calls onCancel and not onCommit on pointercancel", () => {
        const { input, onCommit, onCancel } = renderRange();
        fireEvent.pointerDown(input, { pointerId: 1 });
        fireEvent.change(input, { target: { value: "60" } });
        fireEvent.change(input, { target: { value: "70" } });
        fireEvent.pointerCancel(input, { pointerId: 1 });
        expect(onCommit).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("does nothing extra without onCommit", () => {
        const { input, onChange } = renderRange(false);
        fireEvent.change(input, { target: { value: "60" } });
        fireEvent.pointerUp(input, { pointerId: 1 });
        fireEvent.keyUp(input, { key: "ArrowRight" });
        expect(onChange).toHaveBeenCalledExactlyOnceWith(60);
    });
});
