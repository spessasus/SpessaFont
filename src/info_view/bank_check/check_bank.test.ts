import { describe, expect, it } from "vitest";
import { SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { checkBank } from "./check_bank.ts";

function check(session: ReturnType<typeof createTestSession>) {
    publishSetUp(session);
    return checkBank(session.store.getSnapshot().views);
}

describe("checkBank", () => {
    it("finds the presets that share a patch in the test bank, and nothing else", () => {
        const session = createTestSession();
        const issues = check(session);

        expect(issues).toEqual([
            {
                kind: "duplicatePatch",
                presetIds: session.document.presets.map((p) => getObjectId(p)),
                patch: "0:0:0"
            }
        ]);
    });

    it("finds long and non-Latin-1 names, loops past the end and lone stereo halves", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.name = "A very long sample name";
        right.name = "Żółw";
        left.loopEnd = left.sampleLength + 10;
        // A one-sided link, as a broken file can have
        left.setLinkedSample(right, SampleTypes.leftSample);
        right.linkedSample = undefined;
        right.sampleType = SampleTypes.monoSample;

        const kinds = check(session).map((issue) => issue.kind);

        expect(kinds).toEqual(
            expect.arrayContaining([
                "longName",
                "nonLatin1Name",
                "loopOutside",
                "stereoMismatch"
            ])
        );
    });

    it("finds unused and empty elements, and zones that repeat another", () => {
        const session = createTestSession();
        const [instrument, other] = session.document.instruments;
        // The second preset uses the second instrument, removing it leaves that one unused
        const [, preset] = session.document.presets;
        preset.zones[0].instrument = instrument;
        instrument.zones.push(...instrument.zones);
        other.zones.length = 0;

        const issues = check(session);
        const kinds = issues.map((issue) => issue.kind);

        expect(kinds).toContain("unusedInstrument");
        expect(kinds).toContain("emptyElement");
        expect(kinds).toContain("duplicateZone");
    });
});
