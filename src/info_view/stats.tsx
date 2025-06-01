import type { BasicSoundBank } from "spessasynth_core";
import { useTranslation } from "react-i18next";

export function BankInfoStats({ bank }: { bank: BasicSoundBank }) {
    const { t } = useTranslation();

    // count generators and modulators
    let instrumentGens = 0;
    let instrumentMods = 0;
    for (const instrument of bank.instruments) {
        instrument.instrumentZones.forEach((z) => {
            instrumentGens += z.generators.length;
            instrumentMods += z.modulators.length;
        });
    }
    let presetGens = 0;
    let presetMods = 0;
    for (const preset of bank.presets) {
        preset.presetZones.forEach((z) => {
            presetMods += z.modulators.length;
            presetGens += z.generators.length;
        });
    }

    // count compressed samples
    const compressed = bank.samples.filter((s) => s.isCompressed).length;
    return (
        <div className={"stats"}>
            <h1>{t("bankInfo.stats")}</h1>
            <span>
                <label>{t("bankInfo.version")}</label>
                <pre>{bank.soundFontInfo["ifil"]}</pre>
            </span>
            <span>
                <label>{t("bankInfo.engine")}</label>
                <pre>{bank.soundFontInfo["isng"]}</pre>
            </span>
            <span>
                <label>{t("bankInfo.software")}</label>
                <pre>{bank.soundFontInfo["ISFT"]}</pre>
            </span>

            <span>
                <label>{t("bankInfo.defaultModulators")}</label>
                <pre>
                    {bank.customDefaultModulators
                        ? bank.defaultModulators.length
                        : 0}
                </pre>
            </span>

            <div className={"stat_group"}>
                <label>{t("bankInfo.instruments")}</label>
                <span>
                    <label>{t("bankInfo.count")}</label>
                    <pre>{bank.instruments.length}</pre>
                </span>
                <span>
                    <label>{t("bankInfo.generatorCount")}</label>
                    <pre>{instrumentGens}</pre>
                </span>
                <span>
                    <label>{t("bankInfo.modulatorCount")}</label>
                    <pre>{instrumentMods}</pre>
                </span>
            </div>

            <div className={"stat_group"}>
                <label>{t("bankInfo.presets")}</label>
                <span>
                    <label>{t("bankInfo.count")}</label>
                    <pre>{bank.presets.length}</pre>
                </span>
                <span>
                    <label>{t("bankInfo.generatorCount")}</label>
                    <pre>{presetGens}</pre>
                </span>
                <span>
                    <label>{t("bankInfo.modulatorCount")}</label>
                    <pre>{presetMods}</pre>
                </span>
            </div>

            <div className={"stat_group"}>
                <label>{t("bankInfo.samples")}</label>
                <span>
                    <label>{t("bankInfo.count")}</label>
                    <pre>{bank.samples.length}</pre>
                </span>
                <span>
                    <label>{t("bankInfo.compressed")}</label>
                    <pre>
                        {compressed} (
                        {((compressed / bank.samples.length) * 100).toFixed(0)}
                        %)
                    </pre>
                </span>
            </div>
        </div>
    );
}
