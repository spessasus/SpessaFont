import { useContext, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import "./element_bar.css";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { useInstrumentView } from "../hooks/use_instrument_view.ts";
import { usePresetView } from "../hooks/use_preset_view.ts";
import { useSampleView } from "../hooks/use_sample_view.ts";
import { BottomBar } from "../preset_editor/bottom_bar/bottom_bar.tsx";
import { LinkedPresets } from "../instrument_editor/linked_presets/linked_presets.tsx";
import { ChevronRightIcon } from "../utils/icons/app_icons.tsx";
import { InfoIcon } from "../utils/icons/file_icons.tsx";
import { InstrumentIcon, SpeakerIcon } from "../utils/icons/player_icons.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { PresetPatch } from "../menu_list/preset_display/preset_patch.tsx";
import {
    SAMPLE_SECTIONS,
    type SampleSection
} from "../sample_editor/sample_section.ts";
import { PropertiesSheet } from "./properties_sheet.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";

interface ElementBarProps {
    view: BankEditView;
    /**
     * Called when the sample row is tapped, with the section to show.
     */
    onSampleSection?: (section: SampleSection) => void;
}

interface BarButtonProps {
    glyph: ReactNode;
    glyphClass: string;
    name: string;
    /**
     * Sample names are monospaced, preset and instrument names are not.
     */
    isNameMonospaced?: boolean;
    detail: ReactNode;
    onClick?: () => void;
}

function BarButton({
    glyph,
    glyphClass,
    name,
    isNameMonospaced = false,
    detail,
    onClick
}: BarButtonProps) {
    // The landscape row gives the end to the grid's view bar. Not usePhoneShell, which throws
    // where the bar renders without the shell (its tests)
    const isLandscape = useContext(PhoneShellContext)?.isLandscape ?? false;
    return (
        <button type={"button"} className={"element_bar"} onClick={onClick}>
            <span
                className={`element_bar_glyph ${glyphClass}`}
                aria-hidden={true}
            >
                {glyph}
            </span>
            <span
                className={
                    isNameMonospaced
                        ? "element_bar_name monospaced"
                        : "element_bar_name"
                }
            >
                {name}
            </span>
            {isLandscape ? null : (
                <span className={"element_bar_detail"}>{detail}</span>
            )}
            <span className={"element_bar_chevron"} aria-hidden={true}>
                <ChevronRightIcon />
            </span>
        </button>
    );
}

/**
 * The first user of an element, then how many more there are.
 */
function UsedBy({
    label,
    ids,
    names
}: {
    label: string;
    ids: readonly number[];
    names: ReadonlyMap<number, { readonly name: string }>;
}) {
    // An element with several zones of the same user lists that user once
    const users = Array.from(new Set(ids));
    if (users.length === 0) {
        return null;
    }
    return (
        <>
            <span className={"element_bar_used_by"}>
                {label}{" "}
                <span className={"element_bar_target"}>
                    {names.get(users[0])?.name}
                </span>
            </span>
            {users.length > 1 ? (
                <span className={"element_bar_more"}>+{users.length - 1}</span>
            ) : null}
        </>
    );
}

function PresetBar({ preset }: { preset: BasicPreset }) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const view = usePresetView(session.store, getObjectId(preset));
    const [isOpen, setIsOpen] = useState(false);
    if (!view) {
        return null;
    }
    return (
        <>
            <BarButton
                glyphClass={"element_bar_preset"}
                glyph={<PresetPatch patch={view} />}
                name={view.name}
                detail={t("phoneLocale.overflow.edit")}
                onClick={() => setIsOpen(true)}
            />
            {isOpen ? (
                <PropertiesSheet
                    title={view.name}
                    onClose={() => setIsOpen(false)}
                >
                    <BottomBar preset={preset} />
                </PropertiesSheet>
            ) : null}
        </>
    );
}

function InstrumentBar({ instrument }: { instrument: BasicInstrument }) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const view = useInstrumentView(session.store, getObjectId(instrument));
    const presets = useBankSnapshot(session.store, (s) => s.views.presets);
    const [isOpen, setIsOpen] = useState(false);
    if (!view) {
        return null;
    }
    return (
        <>
            <BarButton
                glyph={<InstrumentIcon />}
                glyphClass={"element_bar_instrument"}
                name={view.name}
                detail={
                    <UsedBy
                        label={t("instrumentLocale.usedBy")}
                        ids={view.usedBy}
                        names={presets}
                    />
                }
                onClick={() => setIsOpen(true)}
            />
            {isOpen ? (
                <PropertiesSheet
                    title={view.name}
                    onClose={() => setIsOpen(false)}
                >
                    <LinkedPresets instrument={instrument} />
                </PropertiesSheet>
            ) : null}
        </>
    );
}

function SampleBar({
    sample,
    onSampleSection
}: {
    sample: BasicSample;
    onSampleSection?: (section: SampleSection) => void;
}) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const view = useSampleView(session.store, getObjectId(sample));
    const instruments = useBankSnapshot(
        session.store,
        (s) => s.views.instruments
    );
    if (!view) {
        return null;
    }
    return (
        <BarButton
            glyph={<SpeakerIcon />}
            glyphClass={"element_bar_sample"}
            onClick={() => onSampleSection?.(SAMPLE_SECTIONS.usedBy)}
            name={view.name}
            isNameMonospaced={true}
            detail={
                <UsedBy
                    label={t("sampleLocale.usedBy")}
                    ids={view.usedBy}
                    names={instruments}
                />
            }
        />
    );
}

/**
 * The phone form of the desktop bottom bars (spec 4.4), under the app bar.
 */
export function ElementBar({ view, onSampleSection }: ElementBarProps) {
    const { t } = useTranslation();
    if (view === "info") {
        return (
            <div className={"element_bar element_bar_static"}>
                <span className={"element_bar_glyph"} aria-hidden={true}>
                    <InfoIcon />
                </span>
                <span className={"element_bar_name"}>
                    {t("presetList.overview")}
                </span>
            </div>
        );
    }
    if (view instanceof BasicPreset) {
        return <PresetBar preset={view} />;
    }
    if (view instanceof BasicInstrument) {
        return <InstrumentBar instrument={view} />;
    }
    return <SampleBar sample={view} onSampleSection={onSampleSection} />;
}
