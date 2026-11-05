import {
    type GeneratorType,
    GeneratorTypes,
    ModulatorControllerSources
} from "spessasynth_core";
import type { ModulatorView } from "../core_backend/entity_views.ts";

/*
 * spessasynth_core does not support SF2.04 linked modulators (see CORE_WISHLIST.md). It loads
 * the sending modulator with an invalid destination (-1), which plays nothing and is saved as
 * 0xFFFF, so the link is gone after a save. The receiving one keeps the "link" source, which
 * core reads as a constant 1, so it applies its full amount all the time. The editor names both
 * as not supported and the bank check lists them, instead of showing them as working.
 */

export function isLinkSource(source: {
    readonly isCC: boolean;
    readonly index: number;
}) {
    return !source.isCC && source.index === ModulatorControllerSources.link;
}

export function isLinkDestination(destination: GeneratorType) {
    return destination === GeneratorTypes.invalid;
}

/**
 * Whether the modulator sends to or receives from another one, which core does not play.
 */
export function isLinkedModulator(mod: ModulatorView) {
    return (
        isLinkDestination(mod.destination) ||
        isLinkSource(mod.primarySource) ||
        isLinkSource(mod.secondarySource)
    );
}
