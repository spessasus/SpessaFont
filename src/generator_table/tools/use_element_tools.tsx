import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
    BasicInstrument,
    type BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useDialogs } from "../../dialogs/dialogs_context.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import { showToastDialog } from "../../toasts/show_toast_dialog.tsx";
import { getObjectId } from "../../utils/object_id.ts";
import { getGeneratorDefault } from "../generator_range.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    createAttenuationActions,
    getAttenuationStats
} from "./attenuation_actions.ts";
import { AttenuationDialog } from "./attenuation_dialog.tsx";
import {
    createKeyCurveActions,
    getPlayedRange,
    isCurveRow
} from "./key_curve_actions.ts";
import { KeyCurveDialog } from "./key_curve_dialog.tsx";
import {
    countSplitZones,
    type SplitMode,
    SplitZonesAction,
    type ZoneSplit
} from "./split_zones_action.ts";
import { SplitZonesDialog } from "./split_zones_dialog.tsx";
import {
    createNaturalReleaseActions,
    hasModEnvelope
} from "../../instrument_editor/natural_release_actions.ts";
import { NaturalReleaseDialog } from "../../instrument_editor/natural_release_dialog.tsx";

type Element = BasicPreset | BasicInstrument;

/**
 * Splitting past this many zones in one element asks first.
 */
const SPLIT_CONFIRM_ZONES = 500;

const identity = (v: number) => v;

function getRows(elements: readonly Element[]) {
    return elements[0] instanceof BasicInstrument
        ? INSTRUMENT_ROWS
        : PRESET_ROWS;
}

/**
 * The tools that change many zones of presets or instruments at once: key curves, even
 * attenuation, natural release and zone splitting. Each asks in a dialog first, and runs as one
 * undo step. All elements of one call are of one kind.
 */
export function useElementTools() {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const { openDialog } = useDialogs();

    const hasApplied = (actions: Parameters<typeof apply>[0]) => {
        if (actions.length === 0) {
            toast(t("toolsLocale.nothingChanged"));
            return false;
        }
        apply(actions);
        return true;
    };

    const openKeyCurve = async (
        elements: readonly Element[],
        generator?: GeneratorType
    ) => {
        const rows = getRows(elements).filter((r) => isCurveRow(r));
        const [firstRow] = rows;
        if (!firstRow) {
            return;
        }
        const isInstrument = elements[0] instanceof BasicInstrument;
        const zones = elements.flatMap((e) => {
            const list: readonly (BasicPresetZone | BasicInstrumentZone)[] =
                e.zones;
            return list.map((z) => ({
                id: getObjectId(z),
                keyRange: getPlayedRange(z.keyRange),
                velRange: getPlayedRange(z.velRange)
            }));
        });
        const getShownDefault = ({
            generator: g,
            fromGenerator = identity
        }: GeneratorRowType) =>
            fromGenerator(getGeneratorDefault(g, isInstrument));
        const settings = await openDialog<
            Parameters<typeof createKeyCurveActions>[1]
        >((onAnswer) => (
            <KeyCurveDialog
                rows={rows}
                initialRow={
                    rows.find((r) => r.generator === generator) ?? firstRow
                }
                zones={zones}
                getShownDefault={getShownDefault}
                initialSeed={Math.floor(Math.random() * 4_294_967_296)}
                onAnswer={onAnswer}
            />
        ));
        if (settings) {
            hasApplied(createKeyCurveActions(elements, settings));
        }
    };

    const openAttenuation = async (elements: readonly Element[]) => {
        const stats = getAttenuationStats(elements);
        const row = getRows(elements).find(
            (r) => r.generator === GeneratorTypes.initialAttenuation
        );
        if (!stats || !row) {
            toast(t("toolsLocale.noZones"));
            return;
        }
        const answer = await openDialog<{ offset: number; isReduced: boolean }>(
            (onAnswer) => (
                <AttenuationDialog
                    stats={stats}
                    row={row}
                    onAnswer={onAnswer}
                />
            )
        );
        if (
            answer &&
            hasApplied(createAttenuationActions(elements, answer.offset)) &&
            answer.isReduced
        ) {
            toast(t("toolsLocale.attenuation.reduced"));
        }
    };

    const openNaturalRelease = async (
        instruments: readonly BasicInstrument[]
    ) => {
        const modEnvelopeZones = instruments
            .flatMap((i) => i.zones)
            .filter((z) => hasModEnvelope(z)).length;
        const release = await openDialog<
            Parameters<typeof createNaturalReleaseActions>[1]
        >((onAnswer) => (
            <NaturalReleaseDialog
                modEnvelopeZones={modEnvelopeZones}
                onAnswer={onAnswer}
            />
        ));
        if (!release) {
            return;
        }
        const { actions, clamped, overwritten } = createNaturalReleaseActions(
            instruments,
            release
        );
        if (!hasApplied(actions)) {
            return;
        }

        if (clamped > 0) {
            toast(t("toolsLocale.naturalRelease.clamped", { count: clamped }));
        }
        if (overwritten > 0) {
            toast(
                t("toolsLocale.naturalRelease.overwritten", {
                    count: overwritten
                })
            );
        }
    };

    /**
     * Splits the zones, asking first when an element would get very many.
     * @param elements the elements
     * @param zoneSplit how to split
     * @param only the zones to split, all by default
     */
    const split = (
        elements: readonly Element[],
        zoneSplit: ZoneSplit,
        only?: ReadonlySet<BasicPresetZone | BasicInstrumentZone>
    ) => {
        const counts = elements.map((e) => countSplitZones(e, zoneSplit, only));
        const splittable = elements.filter((_, i) => counts[i].isChanged);
        if (splittable.length === 0) {
            toast(t("toolsLocale.split.nothingToSplit"));
            return;
        }
        const skipped = elements.length - splittable.length;
        const run = () => {
            apply(
                splittable.map((e) => new SplitZonesAction(e, zoneSplit, only))
            );
            if (skipped > 0) {
                toast(t("toolsLocale.split.skipped", { count: skipped }));
            }
        };
        const largest = Math.max(...counts.map((c) => c.total));
        if (largest <= SPLIT_CONFIRM_ZONES) {
            run();
            return;
        }
        showToastDialog({
            content: t("toolsLocale.split.confirmMany", { count: largest }),
            buttons: [{ label: t("yes"), onClick: run }, { label: t("no") }]
        });
    };

    const openSplitZones = async (
        elements: readonly Element[],
        initialMode: SplitMode = "key",
        only?: ReadonlySet<BasicPresetZone | BasicInstrumentZone>
    ) => {
        const zoneSplit = await openDialog<ZoneSplit>((onAnswer) => (
            <SplitZonesDialog initialMode={initialMode} onAnswer={onAnswer} />
        ));
        if (zoneSplit) {
            split(elements, zoneSplit, only);
        }
    };

    return {
        openKeyCurve,
        openAttenuation,
        openNaturalRelease,
        openSplitZones,
        split
    };
}
