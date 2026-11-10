// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { type BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    getMirror,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import {
    type DialogsAPI,
    DialogsContext,
    type PickElementOptions
} from "../dialogs/dialogs_context.ts";
import { getObjectId } from "../utils/object_id.ts";
import { useSampleEdits } from "./use_sample_edits.ts";

type Session = ReturnType<typeof createTestSession>;

const LENGTH = 5000;

function setUp(names: string[]) {
    const session = createTestSession();
    const samples = names.map((name) => {
        const sample = new EmptySample();
        sample.name = name;
        sample.setAudioData(new Float32Array(LENGTH), 44_100);
        sample.loopStart = 0;
        sample.loopEnd = LENGTH;
        session.document.addSample(sample);
        return sample;
    });
    return { session, samples };
}

/**
 * Renders the hook for the sample. `pick` answers the partner picker, from the items it shows.
 */
function renderEdits(
    session: Session,
    sample: BasicSample,
    pick: (items: readonly unknown[]) => unknown = () => undefined
) {
    publishSetUp(session);
    const view = session.store
        .getSnapshot()
        .views.samples.get(getObjectId(sample));
    if (!view) {
        throw new Error("The sample has no view");
    }
    const editor = {
        session,
        apply: (
            actions: Parameters<typeof session.history.do>[0],
            mergeKey?: string
        ) => {
            session.history.do(actions, mergeKey);
        },
        setView: () => {
            // The test shows no view
        },
        playSample: () => {
            // Nor plays anything
        }
    };
    const pickElement = <T,>({ items }: PickElementOptions<T>) =>
        Promise.resolve(pick(items) as T | undefined);
    const dialogs: DialogsAPI = {
        pickElement,
        askNumber: () => Promise.resolve(undefined),
        openDialog: () => Promise.resolve(undefined)
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
        <BankEditorContext value={editor}>
            <DialogsContext value={dialogs}>{children}</DialogsContext>
        </BankEditorContext>
    );
    return renderHook(() => useSampleEdits(sample, view), { wrapper }).result;
}

describe("useSampleEdits", () => {
    it("stores whole loop points, rates and keys", () => {
        const { session, samples } = setUp(["S"]);
        const [sample] = samples;
        const result = renderEdits(session, sample);

        act(() => {
            result.current.setLoopStart(1000.5);
            result.current.setSampleRate(44_100.7);
            result.current.setCentCorrection(-0.4);
        });

        expect(sample.loopStart).toBe(1001);
        expect(sample.sampleRate).toBe(44_101);
        expect(sample.pitchCorrection).toBe(0);
        const mirrored = getMirror(session).bank.samples.find(
            (s) => s.name === "S"
        );
        expect(mirrored?.loopStart).toBe(1001);
    });

    it("leaves a partner with a loop of its own alone", () => {
        const { session, samples } = setUp(["L", "R"]);
        const [left, right] = samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        right.loopEnd = 2000;
        const result = renderEdits(session, left);

        act(() => {
            result.current.setLoopStart(3000);
        });

        expect([left.loopStart, left.loopEnd]).toEqual([3000, 5000]);
        expect([right.loopStart, right.loopEnd]).toEqual([0, 2000]);
    });

    it("moves the loop of a partner that shares it", () => {
        const { session, samples } = setUp(["L", "R"]);
        const [left, right] = samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        const result = renderEdits(session, left);

        act(() => {
            result.current.setLoopStart(3000);
        });

        expect(right.loopStart).toBe(3000);
    });

    it("merges a burst of loop steps into one undo step", () => {
        const { session, samples } = setUp(["Bell"]);
        const [sample] = samples;
        sample.loopStart = 1000;
        const result = renderEdits(session, sample);

        act(() => {
            for (let i = 0; i < 10; i += 1) {
                result.current.stepLoopStart(1);
            }
        });

        expect(sample.loopStart).toBe(1010);
        session.history.undo();
        expect(sample.loopStart).toBe(1000);
        expect(session.history.canUndo).toBe(false);
    });

    it("keeps a stepped loop end inside the sample and after the start", () => {
        const { session, samples } = setUp(["Bell"]);
        const [sample] = samples;
        sample.loopStart = 1000;
        sample.loopEnd = 4900;
        const result = renderEdits(session, sample);

        act(() => {
            result.current.stepLoopEnd(100);
        });
        expect(sample.loopEnd).toBe(LENGTH);

        act(() => {
            result.current.stepLoopEnd(-100_000);
        });
        expect(sample.loopEnd).toBe(1000);
    });

    it("steps a partner that shares the loop", () => {
        const { session, samples } = setUp(["L", "R"]);
        const [left, right] = samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        const result = renderEdits(session, left);

        act(() => {
            result.current.stepLoopStart(100);
        });

        expect([left.loopStart, right.loopStart]).toEqual([100, 100]);
    });

    it("asks for the partner of a mono sample, the name match first", async () => {
        const { session, samples } = setUp(["Bell", "Pad L", "Pad R"]);
        const [bell, padLeft, padRight] = samples;
        let shown = new Array<string>();
        const result = renderEdits(session, padLeft, (items) => {
            shown = items.map((item) =>
                typeof item === "object" && item && "name" in item
                    ? String(item.name)
                    : ""
            );
            return items[0];
        });

        await act(async () => {
            result.current.setType(SampleTypes.rightSample);
            await Promise.resolve();
        });

        expect(shown.indexOf("Pad R")).toBe(0);
        expect(shown).toContain("Bell");
        expect(padLeft.linkedSample).toBe(padRight);
        expect(padLeft.sampleType).toBe(SampleTypes.rightSample);
        expect(bell.linkedSample).toBeUndefined();
    });

    it("links nothing when the picker is canceled", async () => {
        const { session, samples } = setUp(["Bell", "Pad"]);
        const [bell] = samples;
        const result = renderEdits(session, bell);

        await act(async () => {
            result.current.setType(SampleTypes.leftSample);
            await Promise.resolve();
        });

        expect(bell.linkedSample).toBeUndefined();
        expect(bell.sampleType).toBe(SampleTypes.monoSample);
    });
});
