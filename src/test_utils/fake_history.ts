import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * A tap anywhere, which pushes the sentinel if it is missing.
 */
function pressAnywhere() {
    act(() => {
        // jsdom has no PointerEvent, the listener only needs the type
        dispatchEvent(new MouseEvent("pointerup"));
    });
}

/**
 * Replaces `history.pushState`, `history.back` and the `history.state` getter for back press
 * tests. There are no real entries, so a `history.back()` cannot fire a popstate into the next
 * test. Call `restore` afterwards.
 */
export function setUpFakeHistory() {
    // The entry history.state reads, kept by the pushState stand-in
    const entry: { state: unknown } = { state: null };
    const pushState = vi
        .spyOn(history, "pushState")
        .mockImplementation((state: unknown) => {
            entry.state = state;
        });
    const stateGetter = vi
        .spyOn(history, "state", "get")
        .mockImplementation(() => entry.state);
    const back = vi.spyOn(history, "back").mockImplementation(() => undefined);

    /**
     * A system back press alone, which moves off the sentinel entry.
     */
    const popState = () => {
        act(() => {
            entry.state = null;
            dispatchEvent(new PopStateEvent("popstate"));
        });
    };

    return {
        pushState,
        back,
        /**
         * Sets what history.state reads, as a reload on an entry would.
         */
        setState: (state: unknown) => {
            entry.state = state;
        },
        pressAnywhere,
        popState,
        /**
         * A tap, then a system back press.
         */
        pressBack: () => {
            pressAnywhere();
            popState();
        },
        restore: () => {
            pushState.mockRestore();
            stateGetter.mockRestore();
            back.mockRestore();
        }
    };
}

export type FakeHistory = ReturnType<typeof setUpFakeHistory>;
