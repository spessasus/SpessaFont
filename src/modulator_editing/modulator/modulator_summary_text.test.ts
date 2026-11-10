import { describe, expect, it } from "vitest";
import i18next from "i18next";
import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource
} from "spessasynth_core";
import { LocaleList } from "../../locale/locale_list.ts";
import { buildModulatorView } from "../../core_backend/entity_views.ts";
import {
    getControllerOptions,
    getDestinationOptions
} from "../../utils/translated_options/translated_options.ts";
import { getModulatorSummaryText } from "./modulator_summary_text.ts";

async function createT() {
    const i18n = i18next.createInstance();
    await i18n.init({ resources: LocaleList, lng: "en", fallbackLng: "en" });
    return i18n.t;
}

function vibratoModulator(secondary = new ModulatorSource()) {
    return buildModulatorView(
        new Modulator(
            new ModulatorSource(MIDIControllers.modulationWheel, 0, true),
            secondary,
            GeneratorTypes.vibLfoToPitch,
            47,
            0
        )
    );
}

describe("getModulatorSummaryText", () => {
    it("names the source, the destination and the amount", async () => {
        const t = await createT();
        const options = {
            controllers: getControllerOptions(t),
            destinations: getDestinationOptions(t)
        };
        const text = getModulatorSummaryText(vibratoModulator(), options, t);
        // The select pads the number for its column, the row does not
        expect(text.source).toBe("CC#1 - Modulation Wheel");
        // The proportional font shows the label's -> as two characters
        expect(text.destination).toBe("Vib LFO → Pitch");
        expect(text.amount).toBe("×47");
    });

    it("adds a secondary source after ×", async () => {
        const t = await createT();
        const options = {
            controllers: getControllerOptions(t),
            destinations: getDestinationOptions(t)
        };
        const text = getModulatorSummaryText(
            vibratoModulator(
                new ModulatorSource(MIDIControllers.expression, 0, true)
            ),
            options,
            t
        );
        expect(text.source).toMatch(/CC#1.* × .*CC#11/);
    });

    it("leaves out No controller as a secondary source", async () => {
        const t = await createT();
        const options = {
            controllers: getControllerOptions(t),
            destinations: getDestinationOptions(t)
        };
        const text = getModulatorSummaryText(vibratoModulator(), options, t);
        expect(text.source).not.toContain(" × ");
    });
});
