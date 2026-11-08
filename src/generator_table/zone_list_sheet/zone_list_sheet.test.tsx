// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { ZoneListSheet } from "./zone_list_sheet.tsx";

const played = vi.hoisted(() => ({
    onPlayed: undefined as ((keys: readonly number[]) => void) | undefined
}));

vi.mock("../../phone_shell/editor_sheet.tsx", () => ({
    EditorSheet: ({
        header,
        children
    }: {
        header: ReactNode;
        children: ReactNode;
    }) => (
        <section>
            <header>{header}</header>
            {children}
        </section>
    )
}));
vi.mock("../../keyboard/use_next_played_keys.ts", () => ({
    useNextPlayedKeys: (
        _count: number,
        onPlayed: (keys: readonly number[]) => void
    ) => {
        played.onPlayed = onPlayed;
    }
}));

function createColumn(id: number, min: number, max: number): ZoneColumn {
    const zone: ZoneView = {
        id,
        keyRange: { min, max },
        velocityRange: undefined,
        generators: [],
        modulators: [],
        childId: id
    };
    return {
        zone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: `Zone ${id}`,
        sample: undefined,
        linkedSample: undefined
    };
}

const GLOBAL: ZoneView = {
    id: 0,
    keyRange: undefined,
    velocityRange: undefined,
    generators: [],
    modulators: [],
    childId: undefined
};

function renderSheet() {
    const a = createColumn(1, 0, 47);
    const b = createColumn(2, 48, 69);
    const onJump = vi.fn();
    const onAddZone = vi.fn();
    const onClose = vi.fn();
    const utils = render(
        <ZoneListSheet
            columns={[a, b]}
            globalZone={GLOBAL}
            isInstrument={true}
            onJump={onJump}
            onAddZone={onAddZone}
            onClose={onClose}
        />
    );
    return { ...utils, a, b, onJump, onAddZone, onClose };
}

describe("ZoneListSheet", () => {
    afterEach(cleanup);

    it("jumps to the first zone for a typed key and stays open", () => {
        const { getByLabelText, onJump, onClose, a } = renderSheet();
        const field = getByLabelText("phoneLocale.zoneSheet.findKey");
        fireEvent.change(field, { target: { value: "D2" } });
        fireEvent.submit(field);
        expect(onJump).toHaveBeenCalledWith(a);
        expect(onClose).not.toHaveBeenCalled();
    });

    it("says when no zone plays the key, jumps to a played key and adds a zone", () => {
        const { getByLabelText, getByText, onJump, onAddZone, b } =
            renderSheet();
        const field = getByLabelText("phoneLocale.zoneSheet.findKey");
        fireEvent.change(field, { target: { value: "100" } });
        fireEvent.submit(field);
        expect(getByText("phoneLocale.zoneSheet.noZone")).toBeTruthy();
        expect(onJump).not.toHaveBeenCalled();
        played.onPlayed?.([65]);
        expect(onJump).toHaveBeenCalledWith(b);
        fireEvent.click(getByText("phoneLocale.zoneSheet.addZone"));
        expect(onAddZone).toHaveBeenCalled();
    });
});
