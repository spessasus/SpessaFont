import {
    BasicInstrument,
    BasicInstrumentZone,
    BasicPreset,
    BasicPresetZone,
    BasicSample,
    type BasicSoundBank
} from "spessasynth_core";
import {
    reorderInstrumentZones,
    ZONE_SORTING_FUNCTION
} from "../utils/reorder_zones.ts";
import { presetSorter } from "../utils/preset_sorter.ts";
import { nameSorter } from "../utils/name_sorter.ts";
import type { BankEntity } from "./bank_view.ts";
import { getObjectId } from "../utils/object_id.ts";

/**
 * Inserts the item before the first item that sorts after it, and returns its index.
 */
function insertSorted<T>(list: T[], item: T, compare: (a: T, b: T) => number) {
    let index = list.findIndex((existing) => compare(existing, item) > 0);
    if (index === -1) {
        index = list.length;
    }
    list.splice(index, 0, item);
    return index;
}

function removeFrom<T extends { name: string }>(list: T[], item: T) {
    const index = list.indexOf(item);
    if (index === -1) {
        throw new Error(`${item.name} does not exist in this sound bank.`);
    }
    list.splice(index, 1);
    return index;
}

/**
 * Sets the zones of an element, checking that each zone has the right type for it.
 */
function replaceZones(
    element: BasicPreset | BasicInstrument,
    zones: readonly (BasicPresetZone | BasicInstrumentZone)[]
) {
    if (element instanceof BasicInstrument) {
        const instrumentZones = zones.filter(
            (z) => z instanceof BasicInstrumentZone
        );
        if (instrumentZones.length !== zones.length) {
            throw new Error(`A zone does not fit ${element.name}.`);
        }
        element.zones = instrumentZones;
        return;
    }
    const presetZones = zones.filter((z) => z instanceof BasicPresetZone);
    if (presetZones.length !== zones.length) {
        throw new Error(`A zone does not fit ${element.name}.`);
    }
    element.zones = presetZones;
}

/**
 * Owns one sound bank and exposes the structural operations that history actions use.
 * It keeps the element lists sorted the way the editor shows them.
 */
export class BankDocument {
    public readonly bank: BasicSoundBank;

    public constructor(bank: BasicSoundBank) {
        this.bank = bank;
        this.sortElements();
    }

    public get presets() {
        return this.bank.presets;
    }

    public get instruments() {
        return this.bank.instruments;
    }

    public get samples() {
        return this.bank.samples;
    }

    /**
     * Whether the element is part of the bank (it may have been removed while selected).
     */
    public contains(entity: BankEntity) {
        if (entity instanceof BasicPreset) {
            return this.presets.includes(entity);
        }
        if (entity instanceof BasicInstrument) {
            return this.instruments.includes(entity);
        }
        return entity instanceof BasicSample && this.samples.includes(entity);
    }

    /**
     * Finds a preset by its view id, or undefined when it is not in the bank (any more).
     * For event handlers, which build actions from the core objects.
     */
    public getPreset(id: number) {
        return this.presets.find((p) => getObjectId(p) === id);
    }

    public getInstrument(id: number) {
        return this.instruments.find((i) => getObjectId(i) === id);
    }

    public getSample(id: number) {
        return this.samples.find((s) => getObjectId(s) === id);
    }

    public getBankName(unnamed: string) {
        const name = this.bank.soundBankInfo.name;
        return name.length > 0 ? name : unnamed;
    }

    public sortElements() {
        this.sortPresets();
        this.samples.sort(nameSorter);
        this.instruments.sort(nameSorter);
        for (const instrument of this.instruments) {
            this.sortZones(instrument);
        }
        for (const preset of this.presets) {
            this.sortZones(preset);
        }
    }

    /**
     * Re-sorts the presets after a MIDI patch change and refreshes the bank's preset lookup.
     */
    public sortPresets() {
        this.bank.flush();
        this.presets.sort(presetSorter);
    }

    public sortZones(element: BasicPreset | BasicInstrument) {
        if (element instanceof BasicInstrument) {
            element.zones = reorderInstrumentZones(element.zones);
        } else {
            element.zones = element.zones.slice().sort(ZONE_SORTING_FUNCTION);
        }
    }

    /**
     * Adds a sample in name order and returns its index.
     */
    public addSample(sample: BasicSample) {
        return insertSorted(this.samples, sample, nameSorter);
    }

    /**
     * Puts a removed sample back at its previous index.
     */
    public restoreSample(sample: BasicSample, index: number) {
        this.samples.splice(index, 0, sample);
    }

    /**
     * Removes a sample and returns its index. Its stereo link is kept, so undo restores it unchanged.
     */
    public removeSample(sample: BasicSample) {
        return removeFrom(this.samples, sample);
    }

    /**
     * Adds a new instrument in name order and returns its index.
     * Its zones linked their samples when they were created.
     */
    public addInstrument(instrument: BasicInstrument) {
        return insertSorted(this.instruments, instrument, nameSorter);
    }

    /**
     * Puts a removed instrument back at its previous index and links its samples again.
     */
    public restoreInstrument(instrument: BasicInstrument, index: number) {
        instrument.restore();
        this.instruments.splice(index, 0, instrument);
    }

    /**
     * Removes an unused instrument, unlinks its samples and returns its index.
     */
    public removeInstrument(instrument: BasicInstrument) {
        const index = this.instruments.indexOf(instrument);
        this.bank.deleteInstrument(instrument);
        return index;
    }

    /**
     * Adds a new preset and re-sorts the presets.
     * Its zones linked their instruments when they were created.
     */
    public addPreset(preset: BasicPreset) {
        this.presets.push(preset);
        this.sortPresets();
    }

    /**
     * Puts a removed preset back at its index. Re-sorting would not do, as presets with the same
     * patch keep the order they were added in.
     */
    public restorePreset(preset: BasicPreset, index: number) {
        preset.restore();
        this.presets.splice(index, 0, preset);
    }

    /**
     * Removes a preset, unlinks its instruments and returns its index before removal.
     */
    public removePreset(preset: BasicPreset) {
        const index = this.presets.indexOf(preset);
        this.bank.deletePreset(preset);
        this.sortPresets();
        return index;
    }

    /**
     * Removes a zone from an element, unlinks its child and returns the zone's index.
     */
    public removeZone(
        element: BasicPreset | BasicInstrument,
        zone: BasicPresetZone | BasicInstrumentZone
    ) {
        const index = element.zones.findIndex((z) => z === zone);
        if (index === -1) {
            throw new Error(`The zone does not belong to ${element.name}.`);
        }
        if (element instanceof BasicInstrument) {
            element.deleteZone(index, true);
        } else {
            element.deleteZone(index);
        }
        return index;
    }

    /**
     * Puts a removed zone back at the given index and links its child again.
     * Reusing the zone object keeps earlier history actions that point to it valid.
     */
    public restoreZone(
        element: BasicPreset | BasicInstrument,
        zone: BasicPresetZone | BasicInstrumentZone,
        index: number
    ) {
        const zones: (BasicPresetZone | BasicInstrumentZone)[] = [
            ...element.zones
        ];
        zones.splice(index, 0, zone);
        replaceZones(element, zones);
        // linkTo is internal in spessasynth_core, so the zone's link is added directly,
        // one entry per zone like linkTo does. A public linkTo would remove this.
        if (element instanceof BasicInstrument) {
            if (zone instanceof BasicInstrumentZone) {
                zone.sample.linkedTo.push(element);
            }
        } else if (zone instanceof BasicPresetZone) {
            zone.instrument.linkedTo.push(element);
        }
    }

    /**
     * Replaces the element's zones with the same zones in a previous order.
     * Re-sorting zones with equal ranges is not stable, so undo restores the exact order instead.
     */
    public setZoneOrder(
        element: BasicPreset | BasicInstrument,
        zones: readonly (BasicPresetZone | BasicInstrumentZone)[]
    ) {
        const current = new Set<BasicPresetZone | BasicInstrumentZone>(
            element.zones
        );
        if (
            zones.length !== current.size ||
            zones.some((z) => !current.has(z))
        ) {
            throw new Error(`The zone order does not match ${element.name}.`);
        }
        replaceZones(element, zones);
    }
}
