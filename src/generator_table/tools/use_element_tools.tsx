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
import { getElementRows } from "./element_rows.ts";
import { useScopedToastDialog } from "../../hooks/use_scoped_toast_dialog.ts";
import { getPlayedGenerator, getPlayedRange } from "../played_value.ts";
import { identity } from "../generator_row_type.ts";
import {
    createAttenuationActions,
    getAttenuationStats
} from "./attenuation_actions.ts";
import { AttenuationDialog } from "./attenuation_dialog.tsx";
import { createKeyCurveActions, isCurveRow } from "./key_curve_actions.ts";
import { KeyCurveDialog } from "./key_curve_dialog.tsx";
import { createSeed } from "./use_key_curve_form.ts";
import {
    countSplitZones,
    type SplitMode,
    SplitZonesAction,
    type ZoneSplit
} from "./split_zones_action.ts";
import { SplitZonesDialog } from "./split_zones_dialog.tsx";
import {
    createNaturalReleaseActions,
    isEnvelopeReplaced
} from "../../instrument_editor/natural_release_actions.ts";
import { NaturalReleaseDialog } from "../../instrument_editor/natural_release_dialog.tsx";
import { createSpreadActions } from "../../instrument_editor/spread_actions.ts";
import {
    createDrumMapActions,
    DRUM_MAP_START_KEY
} from "../../instrument_editor/drum_map_actions.ts";

/**
 * Splitting past this many zones in one element asks first.
 */
const SPLIT_CONFIRM_ZONES = 500;

/**
 * The tools that change many zones of presets or instruments at once: key curves, even
 * attenuation, natural release, zone splitting, spreading and drum maps. Most ask in a dialog
 * first, and each runs as one undo step or says that nothing changed. All elements of one call
 * are of one kind.
 */
export function useElementTools() {
    type Element = BasicPreset | BasicInstrument;
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { openDialog, askNumber } = useDialogs();
    const showScopedToastDialog = useScopedToastDialog();

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
        const rows = getElementRows(elements[0]).filter((r) => isCurveRow(r));
        const [firstRow] = rows;
        if (!firstRow) {
            return;
        }
        const zones = elements.flatMap((e) => {
            const list: readonly (BasicPresetZone | BasicInstrumentZone)[] =
                e.zones;
            return list.map((z) => ({
                keyRange: getPlayedRange(e, z, GeneratorTypes.keyRange),
                velRange: getPlayedRange(e, z, GeneratorTypes.velRange)
            }));
        });
        if (zones.length === 0) {
            toast(t("toolsLocale.noZones"));
            return;
        }
        // What the zones play now for each row, the range a replace starts from
        const playedRanges = new Map(
            rows.map(({ generator: g, fromGenerator = identity }) => {
                let low = Infinity;
                let high = -Infinity;
                for (const element of elements) {
                    for (const zone of element.zones) {
                        const shown = fromGenerator(
                            getPlayedGenerator(element, zone, g)
                        );
                        low = Math.min(low, shown);
                        high = Math.max(high, shown);
                    }
                }
                return [g, { min: low, max: high }];
            })
        );
        const settings = await openDialog<
            Parameters<typeof createKeyCurveActions>[1]
        >((onAnswer) => (
            <KeyCurveDialog
                rows={rows}
                initialRow={
                    rows.find((r) => r.generator === generator) ?? firstRow
                }
                zones={zones}
                playedRanges={playedRanges}
                initialSeed={createSeed()}
                onAnswer={onAnswer}
            />
        ));
        if (settings) {
            hasApplied(createKeyCurveActions(elements, settings));
        }
    };

    const openAttenuation = async (elements: readonly Element[]) => {
        const stats = getAttenuationStats(elements);
        const row = getElementRows(elements[0]).find(
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
        const modEnvelopeZones = instruments.flatMap((i) =>
            i.zones.filter((z) => isEnvelopeReplaced(i, z))
        ).length;
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
     * Splits the zones, asking first when an element would get very many. The answer checks
     * the bank again, as elements may have been removed or changed while the toast was open.
     * @param elements the elements
     * @param zoneSplit how to split
     * @param only the zones to split, all by default
     */
    const split = (
        elements: readonly Element[],
        zoneSplit: ZoneSplit,
        only?: ReadonlySet<BasicPresetZone | BasicInstrumentZone>
    ) => {
        const run = (isConfirmed: boolean) => {
            const present = elements.filter((e) =>
                session.document.contains(e)
            );
            const counts = present.map((e) =>
                countSplitZones(e, zoneSplit, only)
            );
            const splittable = present.filter((_, i) => counts[i].isChanged);
            if (splittable.length === 0) {
                toast(t("toolsLocale.split.nothingToSplit"));
                return;
            }
            let largest = 0;
            for (const { total } of counts) {
                largest = Math.max(largest, total);
            }
            if (!isConfirmed && largest > SPLIT_CONFIRM_ZONES) {
                showScopedToastDialog({
                    content: t("toolsLocale.split.confirmMany", {
                        count: largest
                    }),
                    buttons: [
                        { label: t("yes"), onClick: () => run(true) },
                        { label: t("no") }
                    ]
                });
                return;
            }
            apply(
                splittable.map((e) => new SplitZonesAction(e, zoneSplit, only))
            );
            const skipped = elements.length - splittable.length;
            if (skipped > 0) {
                toast(t("toolsLocale.split.skipped", { count: skipped }));
            }
        };
        run(false);
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

    const spread = (instruments: readonly BasicInstrument[]) => {
        hasApplied(instruments.flatMap((i) => createSpreadActions(i)));
    };

    const openDrumMap = async (instruments: readonly BasicInstrument[]) => {
        const startKey = await askNumber({
            title: t("contextMenu.drumMapTitle"),
            label: t("contextMenu.drumMapLabel"),
            initial: DRUM_MAP_START_KEY,
            min: 0,
            max: 127,
            step: 1
        });
        if (startKey === undefined) {
            return;
        }
        const maps = instruments.map((i) => createDrumMapActions(i, startKey));
        hasApplied(maps.flatMap((m) => m.actions));
        let skipped = 0;
        for (const map of maps) {
            skipped += map.skipped;
        }
        if (skipped > 0) {
            toast.error(t("contextMenu.drumMapSkipped", { count: skipped }));
        }
    };

    return {
        openKeyCurve,
        openAttenuation,
        openNaturalRelease,
        openSplitZones,
        split,
        spread,
        openDrumMap
    };
}
