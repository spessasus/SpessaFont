import type {
    InstrumentView,
    SampleView,
    ZoneView
} from "../core_backend/entity_views.ts";
import { getStereoBaseName } from "../utils/stereo_regex.ts";
import { isSameModulatorList } from "../modulator_editing/same_modulator.ts";

/**
 * One column of the generator table. An adjacent stereo pair shares a column,
 * and edits to it are applied to both zones.
 */
export interface ZoneColumn {
    zone: ZoneView;
    /**
     * The stereo partner that receives the same edits, if any.
     */
    linkedZone: ZoneView | undefined;
    colSpan: number;
    isStereo: boolean;
    name: string;
    /**
     * The sample of an instrument zone, for the root key placeholder and the offset limit.
     */
    sample: SampleView | undefined;
    /**
     * The sample of the stereo partner.
     */
    linkedSample: SampleView | undefined;
}

/**
 * The children a table shows: the samples of an instrument, or the instruments of a preset.
 */
export type ZoneChildren =
    | { kind: "samples"; views: ReadonlyMap<number, SampleView> }
    | { kind: "instruments"; views: ReadonlyMap<number, InstrumentView> };

/**
 * Which zones start a stereo pair with the zone right after them. Each zone is in one pair
 * at most, so a zone that got the same sample as a paired one (after "Replace sample") stays on
 * its own. A partner further away is not paired, as it has a column of its own and an edit
 * to one column must not change a value shown in another.
 */
function getPairStarts(zones: readonly ZoneView[], children: ZoneChildren) {
    const starts = new Set<number>();
    if (children.kind !== "samples") {
        return starts;
    }
    for (let i = 0; i < zones.length - 1; i++) {
        const { childId } = zones[i];
        const linkedSampleId =
            childId === undefined
                ? undefined
                : children.views.get(childId)?.linkedSampleId;
        if (
            linkedSampleId === undefined ||
            zones[i + 1].childId !== linkedSampleId
        ) {
            continue;
        }

        starts.add(i);
        // The partner cannot start a pair of its own
        i++;
    }
    return starts;
}

/**
 * Lays out the zones as table columns.
 * With `shouldSplitPairs`, both zones of a stereo pair get their own column and are edited
 * separately (used for pan, which differs between the left and right sample).
 */
export function getZoneColumns(
    zones: readonly ZoneView[],
    children: ZoneChildren,
    shouldSplitPairs = false
) {
    const pairStarts = getPairStarts(zones, children);
    const getChild = (zone: ZoneView) =>
        zone.childId === undefined
            ? undefined
            : children.views.get(zone.childId);
    const getSample = (zone: ZoneView) =>
        children.kind === "samples" && zone.childId !== undefined
            ? children.views.get(zone.childId)
            : undefined;
    const getSingleColumn = (zone: ZoneView) => ({
        zone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: getChild(zone)?.name ?? "",
        sample: getSample(zone),
        linkedSample: undefined
    });
    const columns = new Array<ZoneColumn>();
    for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        if (!pairStarts.has(i)) {
            columns.push(getSingleColumn(zone));
            continue;
        }
        const linkedZone = zones[i + 1];
        // The partner is in this column
        i++;
        if (shouldSplitPairs) {
            columns.push(getSingleColumn(zone), getSingleColumn(linkedZone));
            continue;
        }
        const name = getChild(zone)?.name ?? "";
        columns.push({
            zone,
            linkedZone,
            colSpan: 2,
            isStereo: true,
            name: getStereoBaseName(name, getChild(linkedZone)?.name ?? name),
            sample: getSample(zone),
            linkedSample: getSample(linkedZone)
        });
    }
    return columns;
}

/**
 * The columns of the modulator row. A stereo pair whose zones have different modulators is
 * split, so each zone's list is shown and edited on its own and an edit never replaces a
 * list the user did not see.
 * @param columns the columns of the table
 * @param splitColumns the same columns with the pairs split
 */
export function getModulatorColumns(
    columns: readonly ZoneColumn[],
    splitColumns: readonly ZoneColumn[]
) {
    return columns.flatMap((column) => {
        const { zone, linkedZone } = column;
        return linkedZone &&
            !isSameModulatorList(zone.modulators, linkedZone.modulators)
            ? splitColumns.filter(
                  (c) => c.zone.id === zone.id || c.zone.id === linkedZone.id
              )
            : [column];
    });
}

/**
 * The zones a column shows, the stereo partner second.
 */
export function getViewZones({ zone, linkedZone }: ZoneColumn) {
    return linkedZone ? [zone, linkedZone] : [zone];
}

/**
 * A generator's value in a zone view, or null when the zone does not set it.
 */
export function getViewGenerator(zone: ZoneView, type: number) {
    return zone.generators.find((g) => g.type === type)?.value ?? null;
}
