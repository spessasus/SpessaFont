// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LoopSection } from "./loop_section.tsx";

afterEach(() => {
    cleanup();
});

function renderLoopSection(isLoading = false) {
    const handlers = {
        onPlay: vi.fn(),
        onStop: vi.fn(),
        onLoopStartChange: vi.fn((value: number) => value),
        onLoopEndChange: vi.fn((value: number) => value),
        onStepLoopStart: vi.fn(),
        onStepLoopEnd: vi.fn(),
        onAutoLoop: vi.fn(),
        onTrimAfterLoop: vi.fn()
    };
    render(
        <LoopSection
            loopStart={5448}
            loopEnd={6011}
            length={6012}
            playerState={"stopped"}
            isLoading={isLoading}
            {...handlers}
        />
    );
    return handlers;
}

describe("LoopSection", () => {
    it("steps the loop points by 1 and 100 both ways", () => {
        const handlers = renderLoopSection();
        // -100, -1, +1, +100 for the start, then the same for the end
        const steppers = screen.getAllByRole("button", {
            name: "phoneLocale.sample.moveLoopPoint"
        });
        expect(steppers).toHaveLength(8);
        expect(steppers.map((button) => button.textContent)).toEqual([
            "-100",
            "-1",
            "+1",
            "+100",
            "-100",
            "-1",
            "+1",
            "+100"
        ]);
        fireEvent.pointerDown(steppers[2]);
        fireEvent.pointerUp(steppers[2]);
        expect(handlers.onStepLoopStart).toHaveBeenCalledExactlyOnceWith(1);
        fireEvent.pointerDown(steppers[4]);
        fireEvent.pointerUp(steppers[4]);
        expect(handlers.onStepLoopEnd).toHaveBeenCalledExactlyOnceWith(-100);
    });

    it("shows numeric fields and runs Auto loop and Trim after loop", () => {
        const handlers = renderLoopSection();
        const start = screen.getByRole("textbox", {
            name: "sampleLocale.loopStart"
        });
        const end = screen.getByRole("textbox", {
            name: "sampleLocale.loopEnd"
        });
        expect(start.getAttribute("inputmode")).toBe("numeric");
        expect(end.getAttribute("inputmode")).toBe("numeric");
        expect(start instanceof HTMLInputElement && start.value).toBe("5448");
        expect(end instanceof HTMLInputElement && end.value).toBe("6011");

        fireEvent.click(
            screen.getByRole("button", { name: "sampleLocale.tools.autoLoop" })
        );
        expect(handlers.onAutoLoop).toHaveBeenCalledOnce();
        fireEvent.click(
            screen.getByRole("button", {
                name: "toolsLocale.trim.trimAfterLoop"
            })
        );
        expect(handlers.onTrimAfterLoop).toHaveBeenCalledOnce();
    });

    it("disables Auto loop and Trim after loop while the audio is busy", () => {
        const handlers = renderLoopSection(true);
        for (const name of [
            "sampleLocale.tools.autoLoop",
            "toolsLocale.trim.trimAfterLoop"
        ]) {
            const button = screen.getByRole("button", { name });
            expect(button.getAttribute("aria-disabled")).toBe("true");
            fireEvent.click(button);
        }
        expect(handlers.onAutoLoop).not.toHaveBeenCalled();
        expect(handlers.onTrimAfterLoop).not.toHaveBeenCalled();
    });
});
