import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../fancy_inputs/segmented_control/segmented_control.tsx";
import { SAMPLE_SECTIONS, type SampleSection } from "./sample_section.ts";

interface SampleSectionsProps {
    section: SampleSection;
    onSectionChange: (section: SampleSection) => void;
    // Slots, so the pane keeps every hook and handler and reuses the desktop children
    wave: ReactNode;
    zoom: ReactNode;
    loop: ReactNode;
    props: ReactNode;
    equalizer: ReactNode;
    usedBy: ReactNode;
}

/**
 * The phone sample editor: the wave and its zoom stay pinned, and only the chosen section is
 * mounted, in a scroller of its own. A swipe on the wave pans it sideways, so the column
 * itself does not scroll.
 */
export function SampleSections({
    section,
    onSectionChange,
    wave,
    zoom,
    loop,
    props,
    equalizer,
    usedBy
}: SampleSectionsProps) {
    const { t } = useTranslation();
    const slots = {
        [SAMPLE_SECTIONS.loop]: loop,
        [SAMPLE_SECTIONS.props]: props,
        [SAMPLE_SECTIONS.eq]: equalizer,
        [SAMPLE_SECTIONS.usedBy]: usedBy
    };
    return (
        <>
            {wave}
            <div className={"sample_sections_zoom"}>{zoom}</div>
            <div className={"sample_sections_control"}>
                <SegmentedControl
                    label={t("phoneLocale.sample.sections")}
                    options={[
                        {
                            value: SAMPLE_SECTIONS.loop,
                            label: t("phoneLocale.sample.loop")
                        },
                        {
                            value: SAMPLE_SECTIONS.props,
                            label: t("phoneLocale.sample.props")
                        },
                        {
                            value: SAMPLE_SECTIONS.eq,
                            label: t("phoneLocale.sample.eq")
                        },
                        {
                            value: SAMPLE_SECTIONS.usedBy,
                            label: t("phoneLocale.sample.usedBy")
                        }
                    ]}
                    value={section}
                    onChange={onSectionChange}
                />
            </div>
            {/* Keyed, so another section starts at its top */}
            <div key={section} className={"sample_sections_body"}>
                {slots[section]}
            </div>
        </>
    );
}
