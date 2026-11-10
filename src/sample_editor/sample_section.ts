export const SAMPLE_SECTIONS = {
    loop: "loop",
    props: "props",
    eq: "eq",
    usedBy: "usedBy"
} as const;

export type SampleSection =
    (typeof SAMPLE_SECTIONS)[keyof typeof SAMPLE_SECTIONS];

/**
 * Keeps the id of the sample the section was chosen for, so it only applies to that sample.
 */
export interface StoredSampleSection {
    readonly sampleId: number;
    readonly section: SampleSection;
}

/**
 * The section is stored with the sample it was chosen for, so another sample starts on Loop
 * without an effect that resets it.
 */
export function getShownSampleSection(
    stored: StoredSampleSection | undefined,
    shownSampleId: number | undefined
) {
    return stored !== undefined && stored.sampleId === shownSampleId
        ? stored.section
        : SAMPLE_SECTIONS.loop;
}
