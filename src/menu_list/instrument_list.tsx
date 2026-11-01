import {
    BasicInstrument,
    type BasicSample,
    BasicZone,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";
import { CreateInstrumentAction } from "./create_actions/create_instrument_action.ts";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { addAndReorderStereoSamples } from "../utils/add_stereo_samples.ts";
import { getObjectId } from "../utils/object_id.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useExpandedItems, useSectionOpen } from "./use_list_state.ts";

/**
 * Stereo halves are panned fully to their side.
 */
function setStereoPan(zone: BasicZone, sample: BasicSample) {
    if (sample.sampleType === SampleTypes.leftSample) {
        zone.setGenerator(GeneratorTypes.pan, -500);
    } else if (sample.sampleType === SampleTypes.rightSample) {
        zone.setGenerator(GeneratorTypes.pan, 500);
    }
}

interface InstrumentListProps {
    instruments: readonly BasicInstrument[];
    view: BankEditView;
    selected: ReadonlySet<BasicInstrument>;
    selectedSamples: ReadonlySet<BasicSample>;
    onItemClick: (instrument: BasicInstrument, event: MouseEvent) => void;
}

export function InstrumentList({
    instruments,
    view,
    selected,
    selectedSamples,
    onItemClick
}: InstrumentListProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard, contents } = useClipboard();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicInstrument
    );
    const { isExpanded, toggle } = useExpandedItems();

    const createInstrument = () => {
        const samples = addAndReorderStereoSamples(selectedSamples);
        const instrument = new BasicInstrument();
        const firstSample = samples[0];
        instrument.name = firstSample.linkedSample
            ? firstSample.name.replace(STEREO_REGEX, "")
            : firstSample.name;
        // add loop for convenience
        instrument.globalZone.setGenerator(GeneratorTypes.sampleModes, 1);
        for (const sample of samples) {
            setStereoPan(instrument.createZone(sample), sample);
        }
        apply([new CreateInstrumentAction(instrument)]);
    };

    const linkSamples = (instrument: BasicInstrument) => {
        apply(
            addAndReorderStereoSamples(selectedSamples).map((sample) => {
                const zone = new BasicZone();
                setStereoPan(zone, sample);
                return new CreateZoneAction(instrument, zone, sample);
            })
        );
    };

    const canLink = selectedSamples.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.instruments")}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                onAdd={canLink ? createInstrument : undefined}
                onCopy={
                    selected.size > 0
                        ? () => {
                              clipboard.copyInstruments(selected);
                              toast.success(
                                  t("clipboardLocale.copiedInstruments", {
                                      count: selected.size
                                  })
                              );
                          }
                        : undefined
                }
                onPaste={
                    contents.instruments > 0
                        ? () => {
                              apply(
                                  clipboard.pasteInstruments(session.document)
                              );
                              toast.success(
                                  t("clipboardLocale.pastedInstruments", {
                                      count: clipboard.instrumentCount
                                  })
                              );
                          }
                        : undefined
                }
            />
            {isOpen ? (
                <VirtualItemList
                    items={instruments}
                    focusedItem={
                        view instanceof BasicInstrument ? view : undefined
                    }
                    renderItem={(instrument) => {
                        const key = String(getObjectId(instrument));
                        return (
                            <InstrumentDisplay
                                instrument={instrument}
                                view={view}
                                isSelected={selected.has(instrument)}
                                isOpen={isExpanded(key)}
                                onToggle={() => toggle(key)}
                                onClick={(e) => onItemClick(instrument, e)}
                                onLink={
                                    canLink
                                        ? () => linkSamples(instrument)
                                        : undefined
                                }
                            />
                        );
                    }}
                />
            ) : null}
        </>
    );
}
