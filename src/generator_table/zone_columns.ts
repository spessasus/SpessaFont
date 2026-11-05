import type {
    InstrumentView,
    SampleView,
    ZoneView
} from "../core_backend/entity_views.ts";
import { getStereoBaseName } from "../utils/stereo_regex.ts";

/**
 * One column of the generator table. A stereo pair shares a column,
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
}

/**
 * The children a table shows: the samples of an instrument, or the instruments of a preset.
 */
export type ZoneChildren =
    | { kind: "samples"; views: ReadonlyMap<number, SampleView> }
    | { kind: "instruments"; views: ReadonlyMap<number, InstrumentView> };

/**
 * Pairs each zone with its stereo partner, if the partner is the zone right before or after it.
 */
function getLinkedZoneMap(zones: readonly ZoneView[], children: ZoneChildren) {
    /**
     * 0 - no link
     * 1 - first zone of the linked pair
     * 2 - second zone of the linked pair
     */
    type LinkPosition = 0 | 1 | 2;
    const linkedZones = new Set<ZoneView>();
    return zones.map((z, i): { index: LinkPosition; linkedZone?: ZoneView } => {
        let linkedZoneIndex = -1;
        if (children.kind === "samples" && z.childId !== undefined) {
            const linkedSampleId = children.views.get(
                z.childId
            )?.linkedSampleId;
            if (linkedSampleId !== undefined) {
                linkedZoneIndex = zones.findIndex(
                    (other) =>
                        !linkedZones.has(other) &&
                        other.childId === linkedSampleId
                );
            }
        }
        if (linkedZoneIndex < 0) {
            return { index: 0 };
        }
        const linkedZone = zones[linkedZoneIndex];
        if (linkedZoneIndex === i + 1) {
            return { index: 1, linkedZone };
        }
        if (linkedZoneIndex === i - 1) {
            linkedZones.add(linkedZone);
            linkedZones.add(z);
            return { index: 2, linkedZone };
        }
        // A partner further away still gets the same edits, it just has its own column
        return { index: 0, linkedZone };
    });
}

/**
 * Lays out the zones as table columns.
 * With `shouldSplitPairs`, both zones of a stereo pair get their own column and are edited
 * separately, adjacent or not (used for pan, which differs between the left and right sample).
 */
export function getZoneColumns(
    zones: readonly ZoneView[],
    children: ZoneChildren,
    shouldSplitPairs = false
) {
    const linkedZoneMap = getLinkedZoneMap(zones, children);
    const columns = new Array<ZoneColumn>();
    for (const [i, zone] of zones.entries()) {
        const { index, linkedZone } = linkedZoneMap[i];
        const child =
            zone.childId === undefined
                ? undefined
                : children.views.get(zone.childId);
        const sample =
            children.kind === "samples" && zone.childId !== undefined
                ? children.views.get(zone.childId)
                : undefined;
        const name = child?.name ?? "";
        if (index === 0 || shouldSplitPairs) {
            columns.push({
                zone,
                linkedZone:
                    index === 0 && !shouldSplitPairs ? linkedZone : undefined,
                colSpan: 1,
                isStereo: false,
                name,
                sample
            });
            continue;
        }
        if (index === 2) {
            continue;
        }
        columns.push({
            zone,
            linkedZone,
            colSpan: 2,
            isStereo: true,
            name: getStereoBaseName(
                name,
                (linkedZone?.childId === undefined
                    ? undefined
                    : children.views.get(linkedZone.childId)
                )?.name ?? name
            ),
            sample
        });
    }
    return columns;
}

/**
 * A generator's value in a zone view, or null when the zone does not set it.
 */
export function getViewGenerator(zone: ZoneView, type: number) {
    return zone.generators.find((g) => g.type === type)?.value ?? null;
}
