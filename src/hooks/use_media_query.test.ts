// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./use_media_query.ts";
import { stubMatchMedia } from "../test_utils/stub_match_media.ts";

describe("useMediaQuery", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns the query's value, follows changes and stops listening on unmount", () => {
        const media = stubMatchMedia(true);
        const { result, unmount } = renderHook(() => useMediaQuery("(x)"));
        expect(result.current).toBe(true);

        act(() => {
            media.set(false);
        });
        expect(result.current).toBe(false);

        unmount();
        expect(media.listeners.size).toBe(0);
    });
});
