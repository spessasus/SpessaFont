// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { InterfaceSettings } from "./interface_settings.tsx";
import { DEFAULT_SETTINGS } from "../save_load/settings_typedef.ts";

describe("InterfaceSettings", () => {
    afterEach(() => {
        cleanup();
    });

    it("changes the layout", () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(
            <InterfaceSettings
                settings={DEFAULT_SETTINGS}
                onChange={onChange}
            />
        );
        fireEvent.change(getByLabelText("settingsLocale.interface.layout"), {
            target: { value: "phone" }
        });
        expect(onChange).toHaveBeenCalledWith({ layout: "phone" });
    });
});
