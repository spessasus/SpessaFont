// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ZoneHeaderLabel } from "./zone_header_label.tsx";
import { getZoneColorVariable } from "./zone_color.ts";

describe("getZoneColorVariable", () => {
    it("cycles four zone colors", () => {
        expect(getZoneColorVariable(0)).toBe("var(--zone-color-1)");
        expect(getZoneColorVariable(3)).toBe("var(--zone-color-4)");
        expect(getZoneColorVariable(5)).toBe("var(--zone-color-2)");
    });
});

describe("ZoneHeaderLabel", () => {
    afterEach(cleanup);

    it("shows the name, the key range and L+R under a stereo pair", () => {
        const { container, getByText } = render(
            <ZoneHeaderLabel
                name={"12STR55A"}
                keyRange={"48-69"}
                isStereo={true}
                colorIndex={1}
            />
        );
        expect(getByText("12STR55A")).toBeTruthy();
        expect(getByText("48-69")).toBeTruthy();
        expect(getByText("phoneLocale.grid.stereoPair")).toBeTruthy();
        const bar = container.querySelector(".zone_header_color");
        expect(bar?.getAttribute("style")).toContain("var(--zone-color-2)");
    });

    it("leaves out the range line and L+R when there are none", () => {
        const { container, queryByText } = render(
            <ZoneHeaderLabel
                name={"Piano"}
                keyRange={undefined}
                isStereo={false}
                colorIndex={0}
            />
        );
        expect(queryByText("phoneLocale.grid.stereoPair")).toBeNull();
        expect(container.querySelector(".zone_header_range")).toBeNull();
    });
});
