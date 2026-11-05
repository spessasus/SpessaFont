import { describe, expect, it } from "vitest";
import i18next from "i18next";
import { GeneratorTypes, MIDIControllers } from "spessasynth_core";
import { LocaleList } from "../../locale/locale_list.ts";
import {
    getControllerOptions,
    getDestinationOptions
} from "./translated_options.ts";

async function createT(language: string) {
    const i18n = i18next.createInstance();
    await i18n.init({
        resources: LocaleList,
        lng: language,
        fallbackLng: "en"
    });
    return i18n.t;
}

describe("translated options", () => {
    it("names CC 11 Expression, though core calls it differently than the locale", async () => {
        const t = await createT("en");
        const expression = getControllerOptions(t).find(
            (o) => o.value === MIDIControllers.expression
        );
        expect(expression?.label).toContain("Expression Controller");

        const polish = await createT("pl");
        expect(
            getControllerOptions(polish).find(
                (o) => o.value === MIDIControllers.expression
            )?.label
        ).toContain("Kontroler ekspresji");
    });

    it("offers scale tuning and the coarse sample offsets, each with a name", async () => {
        const t = await createT("en");
        const options = getDestinationOptions(t);
        const values = options.map((o) => o.value);
        expect(values).toEqual(
            expect.arrayContaining([
                GeneratorTypes.scaleTuning,
                GeneratorTypes.startAddrsCoarseOffset,
                GeneratorTypes.endAddrsCoarseOffset,
                GeneratorTypes.startloopAddrsCoarseOffset,
                GeneratorTypes.endloopAddrsCoarseOffset
            ])
        );
        for (const option of options) {
            expect(option.label).not.toMatch(/generatorLocale/);
        }
    });
});
