// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Welcome } from "./welcome.tsx";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";

function renderWelcome(layout: LayoutMode, onInstallApp?: () => void) {
    return render(
        <LayoutContext value={layout}>
            <Welcome
                onOpenFile={vi.fn()}
                onNewFile={vi.fn()}
                onInstallApp={onInstallApp}
            />
        </LayoutContext>
    );
}

describe("Welcome", () => {
    afterEach(cleanup);

    it("offers the desktop download on desktop", () => {
        const { queryByText } = renderWelcome("desktop", vi.fn());
        expect(queryByText("welcome.downloadPrompt")).not.toBeNull();
        expect(queryByText("phoneLocale.welcome.installApp")).toBeNull();
    });

    it("offers Install app on a phone only while the browser allows it", () => {
        const onInstallApp = vi.fn();
        const withOffer = renderWelcome("phone", onInstallApp);
        expect(withOffer.queryByText("welcome.downloadPrompt")).toBeNull();
        fireEvent.click(withOffer.getByText("phoneLocale.welcome.installApp"));
        expect(onInstallApp).toHaveBeenCalledTimes(1);
        withOffer.unmount();

        const withoutOffer = renderWelcome("phone");
        expect(withoutOffer.queryByText("welcome.downloadPrompt")).toBeNull();
        expect(
            withoutOffer.queryByText("phoneLocale.welcome.installApp")
        ).toBeNull();
    });
});
