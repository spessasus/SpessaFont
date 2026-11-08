// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { type DialogsAPI, DialogsContext } from "../dialogs/dialogs_context.ts";
import {
    type ContextMenuAPI,
    ContextMenuContext,
    type ContextMenuEntry
} from "../context_menu/context_menu_context.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { getObjectId } from "../utils/object_id.ts";
import { getZoneColumns } from "./zone_columns.ts";
import { TableHeader } from "./table_header.tsx";

function getLabels(entries: readonly ContextMenuEntry[]) {
    return entries.map((e) => (e === "separator" ? e : e.label));
}

function renderHeader(layout: LayoutMode, activeKey?: string) {
    const session = createTestSession();
    const { document } = session;
    const [instrument] = document.instruments;
    const [sample] = document.samples;
    while (instrument.zones.length > 0) {
        instrument.deleteZone(0);
    }
    const zone = instrument.createZone(sample);
    zone.keyRange = { min: 0, max: 47 };
    publishSetUp(session);
    const { views } = session.store.getSnapshot();
    const view = views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    const columns = getZoneColumns(view.zones, {
        kind: "samples",
        views: views.samples
    });
    const setView = vi.fn();
    const onEditModulators = vi.fn();
    const onOpenZoneList = vi.fn();
    const openMenu = vi.fn<ContextMenuAPI["openMenu"]>();
    const dialogs: DialogsAPI = {
        pickElement: () => Promise.resolve(undefined),
        askNumber: () => Promise.resolve(undefined),
        openDialog: () => Promise.resolve(undefined)
    };
    const { container } = render(
        <LayoutContext.Provider value={layout}>
            <BankEditorContext.Provider
                value={{
                    session,
                    apply: () => undefined,
                    setView,
                    playSample: () => undefined
                }}
            >
                <DialogsContext.Provider value={dialogs}>
                    <ContextMenuContext.Provider value={{ openMenu }}>
                        <table>
                            <thead>
                                <TableHeader
                                    element={instrument}
                                    name={view.name}
                                    columns={columns}
                                    globalZone={view.globalZone}
                                    activeKey={activeKey}
                                    onEditModulators={onEditModulators}
                                    onOpenZoneList={onOpenZoneList}
                                />
                            </thead>
                        </table>
                    </ContextMenuContext.Provider>
                </DialogsContext.Provider>
            </BankEditorContext.Provider>
        </LayoutContext.Provider>
    );
    const nameButton = container.querySelector(".header_cell_name");
    const headerCell = nameButton?.closest("th");
    if (!nameButton || !headerCell) {
        throw new Error("The zone header was not rendered.");
    }
    return {
        sample,
        column: columns[0],
        setView,
        onEditModulators,
        onOpenZoneList,
        container,
        openMenu,
        nameButton,
        headerCell
    };
}

describe("TableHeader", () => {
    afterEach(cleanup);

    it("opens the zone on a desktop tap and keeps the right-click menu", () => {
        const { sample, setView, openMenu, nameButton, headerCell } =
            renderHeader("desktop");
        fireEvent.click(nameButton);
        expect(setView).toHaveBeenCalledWith(sample);
        expect(openMenu).not.toHaveBeenCalled();

        fireEvent.contextMenu(headerCell);
        expect(openMenu).toHaveBeenCalledTimes(1);
        const [, entries, options] = openMenu.mock.calls[0];
        expect(getLabels(entries)).toEqual([
            "contextMenu.open",
            "contextMenu.replaceSample",
            "contextMenu.duplicateZone",
            "separator",
            "toolsLocale.split.byKeyMenu",
            "toolsLocale.split.byVelocityMenu",
            "separator",
            "contextMenu.deleteZone"
        ]);
        expect(options).toBeUndefined();
    });

    it("opens the Zones sheet from the phone's corner cell only", () => {
        const phone = renderHeader("phone");
        const button = phone.container.querySelector(".zone_list_button");
        if (!(button instanceof HTMLElement)) {
            throw new TypeError("The corner button was not rendered.");
        }
        fireEvent.click(button);
        expect(phone.onOpenZoneList).toHaveBeenCalledTimes(1);
        cleanup();
        const desktop = renderHeader("desktop");
        expect(desktop.container.querySelector(".zone_list_button")).toBeNull();
        expect(desktop.container.querySelector(".add_zone")).not.toBeNull();
    });

    it("gives the phone's corner button the Tab stop key the desktop add button has", () => {
        const phone = renderHeader("phone");
        const button = phone.container.querySelector(".zone_list_button");
        if (!(button instanceof HTMLElement)) {
            throw new TypeError("The corner button was not rendered.");
        }
        expect(button.dataset.gridKey).toBe("add");
        expect(button.tabIndex).toBe(-1);
        expect(
            button.querySelector("svg")?.closest("[aria-hidden]")
        ).not.toBeNull();
    });

    it("makes the phone's corner button the Tab stop when its key is active", () => {
        const phone = renderHeader("phone", "add");
        const button = phone.container.querySelector(".zone_list_button");
        if (!(button instanceof HTMLElement)) {
            throw new TypeError("The corner button was not rendered.");
        }
        expect(button.tabIndex).toBe(0);
    });

    it("opens the zone header sheet on a phone tap", () => {
        const { column, setView, onEditModulators, openMenu, nameButton } =
            renderHeader("phone");
        fireEvent.click(nameButton);
        expect(setView).not.toHaveBeenCalled();
        expect(openMenu).toHaveBeenCalledTimes(1);
        const [, entries, options] = openMenu.mock.calls[0];
        expect(options).toEqual({ title: "phoneLocale.zoneHeader.title" });
        expect(getLabels(entries)).toEqual([
            "contextMenu.open",
            "contextMenu.replaceSample",
            "contextMenu.duplicateZone",
            "separator",
            "toolsLocale.split.byKeyMenu",
            "toolsLocale.split.byVelocityMenu",
            "phoneLocale.zoneHeader.modulators",
            "separator",
            "contextMenu.deleteZone"
        ]);
        const modulators = entries[6];
        if (modulators === "separator") {
            throw new Error("The Modulators entry is missing.");
        }
        modulators.onSelect();
        expect(onEditModulators).toHaveBeenCalledWith(column.zone.id);
    });

    it("opens the same sheet on a phone long press", () => {
        const { openMenu, headerCell } = renderHeader("phone");
        fireEvent.contextMenu(headerCell);
        expect(openMenu).toHaveBeenCalledTimes(1);
        expect(openMenu.mock.calls[0][2]).toEqual({
            title: "phoneLocale.zoneHeader.title"
        });
    });
});
