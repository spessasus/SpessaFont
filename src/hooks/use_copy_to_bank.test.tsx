// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import toast from "react-hot-toast";
import {
    createTestHost,
    createTestSession,
    snapshotBank
} from "../test_utils/bank_fixture.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import { OpenBanksProvider } from "../tab_list/open_banks_provider.tsx";
import { useOpenBanks } from "../tab_list/open_banks_context.ts";
import { useCopyToBank } from "./use_copy_to_bank.ts";

vi.mock("react-hot-toast", () => ({
    default: Object.assign(vi.fn(), { success: vi.fn() })
}));

function ClipboardWrapper({ children }: { children: ReactNode }) {
    return <ClipboardProvider>{children}</ClipboardProvider>;
}

function setUp() {
    const host = createTestHost();
    const source = createTestSession(host);
    const target = createTestSession(host);
    const { result } = renderHook(() => useCopyToBank(), {
        wrapper: ClipboardWrapper
    });
    return { host, source, target, copyToBank: result.current };
}

function counts(session: BankSession) {
    const { presets, instruments, samples } = session.document;
    return [presets.length, instruments.length, samples.length];
}

describe("useCopyToBank", () => {
    afterEach(() => {
        vi.mocked(toast).mockClear();
        vi.mocked(toast.success).mockClear();
    });

    it("copies the entities into the target bank", () => {
        const { source, target, copyToBank } = setUp();
        const [preset] = source.document.presets;
        const [presetCount, instrumentCount, sampleCount] = counts(target);
        act(() => {
            copyToBank(source, target, [preset]);
        });
        const [presetsAfter, instrumentsAfter, samplesAfter] = counts(target);
        expect(presetsAfter).toBe(presetCount + 1);
        expect(instrumentsAfter).toBeGreaterThan(instrumentCount);
        expect(samplesAfter).toBeGreaterThan(sampleCount);
        expect(toast.success).toHaveBeenCalledOnce();
    });

    it("keeps the source bank unchanged", () => {
        const { source, target, copyToBank } = setUp();
        const before = snapshotBank(source.document.bank);
        act(() => {
            copyToBank(source, target, [...source.document.presets]);
        });
        expect(snapshotBank(source.document.bank)).toEqual(before);
        expect(source.history.canUndo).toBe(false);
    });

    it("reports moved presets", () => {
        // Both banks hold the same presets, so every copy needs another patch
        const { source, target, copyToBank } = setUp();
        const [preset] = source.document.presets;
        const patchOf = (p: typeof preset) =>
            `${p.bankMSB}:${p.bankLSB}:${p.program}:${p.isGMGSDrum}`;
        const holders = () =>
            target.document.presets.filter(
                (p) => patchOf(p) === patchOf(preset)
            ).length;
        const before = holders();
        act(() => {
            copyToBank(source, target, [preset]);
        });
        expect(toast).toHaveBeenCalledWith("clipboardLocale.movedPresets");
        // The copy took a free patch instead of the original's
        expect(holders()).toBe(before);
    });

    it("makes one undo in the target remove the whole copy", () => {
        const { source, target, copyToBank } = setUp();
        const before = snapshotBank(target.document.bank);
        act(() => {
            copyToBank(source, target, [...source.document.presets]);
        });
        act(() => {
            target.history.undo();
        });
        expect(snapshotBank(target.document.bank)).toEqual(before);
        expect(target.history.canUndo).toBe(false);
    });

    it("skips entities the source no longer holds", () => {
        const { host, source, target, copyToBank } = setUp();
        const other = createTestSession(host);
        const before = snapshotBank(target.document.bank);
        act(() => {
            copyToBank(source, target, [other.document.presets[0]]);
        });
        expect(snapshotBank(target.document.bank)).toEqual(before);
        expect(target.history.canUndo).toBe(false);
        expect(toast.success).not.toHaveBeenCalled();
    });
});

interface BanksProbeProps {
    sessions: readonly BankSession[];
    activeId: number;
    onRead: (banks: ReturnType<typeof useOpenBanks>) => void;
}

function BanksProbe({ onRead }: Pick<BanksProbeProps, "onRead">) {
    onRead(useOpenBanks());
    return null;
}

function BanksTree({ sessions, activeId, onRead }: BanksProbeProps) {
    return (
        <OpenBanksProvider sessions={sessions} activeId={activeId}>
            <BanksProbe onRead={onRead} />
        </OpenBanksProvider>
    );
}

describe("useOpenBanks", () => {
    afterEach(cleanup);

    it("offers only open banks", () => {
        const host = createTestHost();
        const first = createTestSession(host);
        const second = createTestSession(host);
        const onRead =
            vi.fn<(banks: ReturnType<typeof useOpenBanks>) => void>();
        const { rerender } = render(
            <BanksTree
                sessions={[first, second]}
                activeId={first.id}
                onRead={onRead}
            />
        );
        expect(onRead).toHaveBeenLastCalledWith({
            sessions: [first, second],
            activeId: first.id
        });
        rerender(
            <BanksTree sessions={[first]} activeId={first.id} onRead={onRead} />
        );
        expect(onRead).toHaveBeenLastCalledWith({
            sessions: [first],
            activeId: first.id
        });
    });

    it("throws outside the provider", () => {
        expect(() => renderHook(() => useOpenBanks())).toThrow(
            /OpenBanksProvider/
        );
    });
});
