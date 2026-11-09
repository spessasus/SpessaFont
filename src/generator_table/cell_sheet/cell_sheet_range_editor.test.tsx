// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import type { ForwardedSynthEvent } from "../../synth_host/protocol.ts";
import { LayoutContext } from "../../layout/layout_context.ts";
import { PhoneShellContext } from "../../phone_shell/phone_shell_context.ts";
import { createShellContext } from "../../test_utils/shell_context.ts";
import { CellSheetRangeEditor } from "./cell_sheet_range_editor.tsx";

const handlers = vi.hoisted(() => ({
    current: undefined as ((event: ForwardedSynthEvent) => void) | undefined
}));

// Subscribes while mounted, as the real hook does with the engine's events
vi.mock("../../hooks/use_synth_event.ts", async () => {
    const { useEffect } =
        await vi.importActual<typeof import("react")>("react");
    return {
        useSynthEvent: (handler: (event: ForwardedSynthEvent) => void) => {
            useEffect(() => {
                handlers.current = handler;
                return () => {
                    handlers.current = undefined;
                };
            });
        }
    };
});

function noteOn(midiNote: number) {
    act(() => {
        handlers.current?.({
            type: "noteOn",
            data: { channel: 0, midiNote, velocity: 100 }
        });
    });
}

function renderEditor(isKeyRange: boolean) {
    const isApplied = vi.fn(() => true);
    const onModeChange = vi.fn();
    const onCaptureStart = vi.fn();
    const result = render(
        <LayoutContext value={"phone"}>
            <PhoneShellContext value={createShellContext()}>
                <CellSheetRangeEditor
                    isKeyRange={isKeyRange}
                    initialRange={{ low: 0, high: 47 }}
                    mode={"set"}
                    onModeChange={onModeChange}
                    isPianoBusy={false}
                    onCaptureStart={onCaptureStart}
                    isDisabled={false}
                    status={"1 of 5 checked"}
                    footer={null}
                    onApply={isApplied}
                />
            </PhoneShellContext>
        </LayoutContext>
    );
    return { isApplied, onModeChange, onCaptureStart, ...result };
}

describe("CellSheetRangeEditor", () => {
    beforeEach(() => {
        handlers.current = undefined;
    });
    afterEach(cleanup);

    it("fills Low and High from two played keys without applying", () => {
        const { isApplied } = renderEditor(true);
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        );
        noteOn(72);
        noteOn(60);
        const [low, high] = screen.getAllByRole("textbox");
        expect(low).toHaveProperty("value", "60");
        expect(high).toHaveProperty("value", "72");
        expect(isApplied).not.toHaveBeenCalled();
    });

    it("offers no piano button on a velocity range row", () => {
        renderEditor(false);
        expect(
            screen.queryByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        ).toBeNull();
    });

    it("ends its capture when it leaves Set mode", () => {
        const { onModeChange } = renderEditor(true);
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        );
        expect(
            screen.queryByText("phoneLocale.capture.playLowHigh")
        ).not.toBeNull();
        fireEvent.click(
            screen.getByRole("radio", { name: "phoneLocale.cellSheet.shift" })
        );
        expect(onModeChange).toHaveBeenCalledWith("shift");
        expect(
            screen.queryByText("phoneLocale.capture.playLowHigh")
        ).toBeNull();
    });

    it("lets one capture run at a time with the sheet's", () => {
        const { onCaptureStart, rerender } = renderEditor(true);
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        );
        // Starting here ends the sheet's capture
        expect(onCaptureStart).toHaveBeenCalledOnce();
        // The sheet starting one ends this one
        rerender(
            <LayoutContext value={"phone"}>
                <PhoneShellContext value={createShellContext()}>
                    <CellSheetRangeEditor
                        isKeyRange={true}
                        initialRange={{ low: 0, high: 47 }}
                        mode={"set"}
                        onModeChange={vi.fn()}
                        isPianoBusy={true}
                        onCaptureStart={vi.fn()}
                        isDisabled={false}
                        status={"1 of 5 checked"}
                        footer={null}
                        onApply={() => true}
                    />
                </PhoneShellContext>
            </LayoutContext>
        );
        expect(
            screen.queryByText("phoneLocale.capture.playLowHigh")
        ).toBeNull();
    });
});
