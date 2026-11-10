// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import { ContextMenuContext } from "../context_menu/context_menu_context.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { SampleList } from "./sample_list.tsx";

// The virtualizer renders no rows in jsdom
vi.mock("./virtual_item_list.tsx", () => ({
    VirtualItemList: ({
        items,
        renderItem
    }: {
        items: readonly object[];
        renderItem: (item: never) => React.ReactNode;
    }) => (
        <>
            {items.map((item, index) => (
                <div key={index}>{renderItem(item as never)}</div>
            ))}
        </>
    )
}));
vi.mock("./use_sample_import.ts", () => ({
    useSampleImport: () => () => Promise.resolve(0)
}));

afterEach(() => {
    cleanup();
});

function renderList(layout: LayoutMode) {
    const session = createTestSession();
    const playSample = vi.fn();
    const sample = session.document.samples[0];
    render(
        <LayoutContext value={layout}>
            <ContextMenuContext value={{ openMenu: vi.fn() }}>
                <ClipboardProvider>
                    <BankEditorContext
                        value={{
                            session,
                            setView: vi.fn(),
                            apply: vi.fn(),
                            playSample
                        }}
                    >
                        <SampleList
                            samples={[sample]}
                            view={"info"}
                            selected={new Set()}
                            cursor={undefined}
                            focusRequest={null}
                            onItemClick={vi.fn()}
                            onItemContextMenu={vi.fn()}
                            onItemPointerDown={vi.fn()}
                            isOpen={true}
                            onOpenChange={vi.fn()}
                            onStartSelection={vi.fn()}
                            isSelecting={false}
                        />
                    </BankEditorContext>
                </ClipboardProvider>
            </ContextMenuContext>
        </LayoutContext>
    );
    return { playSample, sample };
}

function sampleRow() {
    const row = document.querySelector(".sample_display");
    if (!row) {
        throw new Error("The sample row did not render.");
    }
    return row;
}

describe("SampleList", () => {
    it("plays on double click on desktop", () => {
        const { playSample, sample } = renderList("desktop");
        fireEvent.doubleClick(sampleRow());
        expect(playSample).toHaveBeenCalledWith(sample);
        expect(
            screen.queryByRole("button", { name: "sampleLocale.tools.play" })
        ).toBeNull();
    });

    it("plays from the button and not on double click on phones", () => {
        const { playSample, sample } = renderList("phone");
        fireEvent.doubleClick(sampleRow());
        expect(playSample).not.toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole("button", { name: "sampleLocale.tools.play" })
        );
        expect(playSample).toHaveBeenCalledTimes(1);
        expect(playSample).toHaveBeenCalledWith(sample);
    });
});
