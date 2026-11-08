// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GeneratorTypes } from "spessasynth_core";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { SelectCell } from "./select_cell.tsx";

const options = getGeneratorOptions(GeneratorTypes.sampleModes);
const column: ZoneColumn = {
    zone: {
        id: 1,
        keyRange: undefined,
        velocityRange: undefined,
        generators: [{ type: GeneratorTypes.sampleModes, value: 1 }],
        modulators: [],
        childId: undefined
    },
    linkedZone: undefined,
    colSpan: 1,
    isStereo: false,
    name: "Zone",
    sample: undefined,
    linkedSample: undefined
};

function renderCell(layout: LayoutMode) {
    if (!options) {
        throw new Error("No options");
    }
    const onClick = vi.fn();
    render(
        <LayoutContext.Provider value={layout}>
            <table>
                <tbody>
                    <tr>
                        <SelectCell
                            column={column}
                            generator={GeneratorTypes.sampleModes}
                            options={options}
                            label={"Looping"}
                            isSelected={false}
                            gridKey={"cell:54:1"}
                            isActive={true}
                            onPick={vi.fn()}
                            onNudge={vi.fn()}
                            onCellKeyDown={vi.fn()}
                            onClick={onClick}
                            onContextMenu={vi.fn()}
                        />
                    </tr>
                </tbody>
            </table>
        </LayoutContext.Provider>
    );
    return onClick;
}

describe("SelectCell", () => {
    afterEach(cleanup);

    it("renders the native select on desktop", () => {
        renderCell("desktop");
        expect(screen.getByRole("combobox")).toBeTruthy();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("renders a button with the option label in phone mode", () => {
        const onClick = renderCell("phone");
        const button = screen.getByRole("button", { name: "Looping" });
        expect(button.textContent).toBe("soundBankLocale.loopingModes.loop");
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledOnce();
        expect(screen.queryByRole("combobox")).toBeNull();
    });
});
