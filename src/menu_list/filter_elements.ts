import { MIDIPatchTools } from "spessasynth_core";
import type { BankViews, PresetView } from "../core_backend/entity_views.ts";
import { findUnusedIds } from "../core_backend/bank_maintenance.ts";

/**
 * The ids of the listed elements of each kind, in bank order.
 */
export interface FilteredIds {
    presets: readonly number[];
    instruments: readonly number[];
    samples: readonly number[];
}

/**
 * The text a preset is found by (its MIDI patch and name).
 */
export function getPresetSearchText(preset: PresetView) {
    return MIDIPatchTools.toFullMIDIString(preset).toLowerCase();
}

function addChildren(
    element: { zones: readonly { childId: number | undefined }[] } | undefined,
    children: Set<number>
) {
    const zones = element?.zones ?? [];
    for (const zone of zones) {
        if (zone.childId !== undefined) children.add(zone.childId);
    }
}

/**
 * Keeps the elements whose name contains the query, plus the instruments of matching presets
 * and the samples of matching instruments, so a match shows what it uses. An empty query keeps
 * the views' orders as they are.
 */
export function filterElements(views: BankViews, query: string): FilteredIds {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery === "") {
        return {
            presets: views.presetOrder,
            instruments: views.instrumentOrder,
            samples: views.sampleOrder
        };
    }
    const presets = views.presetOrder.filter((id) => {
        const preset = views.presets.get(id);
        return preset && getPresetSearchText(preset).includes(lowerQuery);
    });
    const instruments = new Set(
        views.instrumentOrder.filter((id) =>
            views.instruments.get(id)?.name.toLowerCase().includes(lowerQuery)
        )
    );
    const samples = new Set(
        views.sampleOrder.filter((id) =>
            views.samples.get(id)?.name.toLowerCase().includes(lowerQuery)
        )
    );
    for (const id of presets) {
        addChildren(views.presets.get(id), instruments);
    }
    for (const id of instruments) {
        addChildren(views.instruments.get(id), samples);
    }
    // Keep the bank order, backfilled elements are not appended at the end
    return {
        presets,
        instruments: views.instrumentOrder.filter((id) => instruments.has(id)),
        samples: views.sampleOrder.filter((id) => samples.has(id))
    };
}

/**
 * Only the instruments and samples that "remove unused" would remove.
 * Presets are never used by anything, so none are kept.
 */
export function keepUnused(views: BankViews, ids: FilteredIds): FilteredIds {
    const unused = findUnusedIds(views);
    return {
        presets: [],
        instruments: ids.instruments.filter((id) => unused.instruments.has(id)),
        samples: ids.samples.filter((id) => unused.samples.has(id))
    };
}
