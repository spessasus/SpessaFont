// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PhoneLayerHeader } from "./phone_layer_header.tsx";

describe("PhoneLayerHeader", () => {
    afterEach(cleanup);

    it("names its button and calls onButton", () => {
        const onButton = vi.fn();
        render(
            <PhoneLayerHeader
                icon={"back"}
                buttonLabel={"Back"}
                onButton={onButton}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        expect(onButton).toHaveBeenCalledOnce();
    });

    it("renders the title as a heading and the children after it", () => {
        render(
            <PhoneLayerHeader
                icon={"close"}
                buttonLabel={"Close"}
                onButton={vi.fn()}
                title={"Lists"}
            >
                <button type={"button"}>Pin</button>
            </PhoneLayerHeader>
        );
        const heading = screen.getByRole("heading", { name: "Lists" });
        const child = screen.getByRole("button", { name: "Pin" });
        expect(
            heading.compareDocumentPosition(child) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});
