import type { TFunction } from "i18next";
import { ModulatorControllerSources } from "spessasynth_core";
import type {
    ModulatorSourceView,
    ModulatorView
} from "../../core_backend/entity_views.ts";
import type { TranslatedOptions } from "../../utils/translated_options/translated_options_context.ts";
import { getSourceLabel } from "../source_picker/source_label.ts";

function sourceLabel(
    source: ModulatorSourceView,
    options: TranslatedOptions,
    t: TFunction
) {
    // The select's labels pad the CC number for its monospace column, a row reads better without
    return getSourceLabel(
        { usesCC: source.isCC, sourceIndex: source.index },
        options.controllers,
        t
    ).replaceAll(/\s+/g, " ");
}

/**
 * The texts of a phone modulator summary row: the sources as their pickers name them (the
 * secondary after ×, left out when it is No controller), the destination, and `×47`.
 */
export function getModulatorSummaryText(
    mod: ModulatorView,
    options: TranslatedOptions,
    t: TFunction
) {
    const { secondarySource } = mod;
    const hasSecondary =
        secondarySource.isCC ||
        secondarySource.index !== ModulatorControllerSources.noController;
    const primary = sourceLabel(mod.primarySource, options, t);
    return {
        source: hasSecondary
            ? `${primary} × ${sourceLabel(secondarySource, options, t)}`
            : primary,
        destination:
            options.destinations.find((d) => d.value === mod.destination)
                ?.label ?? String(mod.destination),
        amount: `×${mod.transformAmount}`
    };
}
