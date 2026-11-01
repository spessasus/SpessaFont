// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEventListener } from "./use_event_listener.ts";

describe("useEventListener", () => {
    it("calls the latest handler and stops listening on unmount", () => {
        const calls = new Array<string>();
        const { rerender, unmount } = renderHook(
            ({ label }: { label: string }) =>
                useEventListener(document, "keydown", () => {
                    calls.push(label);
                }),
            { initialProps: { label: "first" } }
        );

        document.dispatchEvent(new KeyboardEvent("keydown"));
        rerender({ label: "second" });
        document.dispatchEvent(new KeyboardEvent("keydown"));
        unmount();
        document.dispatchEvent(new KeyboardEvent("keydown"));

        expect(calls).toEqual(["first", "second"]);
    });

    it("listens to nothing without a target", () => {
        expect(() =>
            renderHook(() =>
                useEventListener(null, "midimessage", () => undefined)
            )
        ).not.toThrow();
    });
});
