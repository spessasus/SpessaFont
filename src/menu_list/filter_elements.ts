import type {
    BasicInstrument,
    BasicPreset,
    BasicSample
} from "spessasynth_core";

export interface BankElements {
    presets: readonly BasicPreset[];
    instruments: readonly BasicInstrument[];
    samples: readonly BasicSample[];
}

/**
 * The text a preset is found by (its MIDI patch and name).
 */
export function getPresetSearchText(preset: BasicPreset) {
    return preset.toString().toLowerCase();
}

/**
 * Keeps the elements whose name contains the query, plus the instruments of matching presets
 * and the samples of matching instruments, so a match shows what it uses.
 */
export function filterElements(
    elements: BankElements,
    query: string
): BankElements {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery === "") {
        return elements;
    }
    const presets = elements.presets.filter((p) =>
        getPresetSearchText(p).includes(lowerQuery)
    );
    const instruments = new Set(
        elements.instruments.filter((i) =>
            i.name.toLowerCase().includes(lowerQuery)
        )
    );
    const samples = new Set(
        elements.samples.filter((s) =>
            s.name.toLowerCase().includes(lowerQuery)
        )
    );
    for (const preset of presets) {
        for (const zone of preset.zones) instruments.add(zone.instrument);
    }
    for (const instrument of instruments) {
        for (const zone of instrument.zones) samples.add(zone.sample);
    }
    // Keep the bank order, backfilled elements are not appended at the end
    return {
        presets,
        instruments: elements.instruments.filter((i) => instruments.has(i)),
        samples: elements.samples.filter((s) => samples.has(s))
    };
}
