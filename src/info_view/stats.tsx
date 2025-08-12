import { useTranslation } from "react-i18next";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import "./stats.css";
import { EditIcon } from "../utils/icons.tsx";

export function BankInfoStats({
    manager,
    toggleDefaultModulators
}: {
    manager: SoundBankManager;
    toggleDefaultModulators: () => void;
}) {
    const { t } = useTranslation();
    const bank = manager;

    // count generators and modulators
    let instrumentGens = 0;
    let instrumentMods = 0;
    for (const instrument of bank.instruments) {
        instrument.zones.forEach((z) => {
            instrumentGens += z.generators.length;
            instrumentMods += z.modulators.length;
        });
    }
    let presetGens = 0;
    let presetMods = 0;
    for (const preset of bank.presets) {
        preset.zones.forEach((z) => {
            presetMods += z.modulators.length;
            presetGens += z.generators.length;
        });
    }

    // count compressed samples
    const compressed = bank.samples.filter((s) => s.isCompressed).length;
    const version = manager.getInfo("version");
    const versionString = `${version.major}.${version.minor}`;
    return (
        <div className={"stats"}>
            <h1>{t("bankInfo.stats")}</h1>
            <span className={"single_stat stat_span"}>
                <label>{t("bankInfo.version")}</label>
                <pre className={"monospaced"}>{versionString}</pre>
            </span>
            <span className={"single_stat stat_span"}>
                <label>{t("bankInfo.engine")}</label>
                <pre className={"monospaced"}>
                    {manager.getInfo("soundEngine")}
                </pre>
            </span>
            <span className={"single_stat stat_span"}>
                <label>{t("bankInfo.software")}</label>
                <pre className={"monospaced"}>
                    {manager.getInfo("software")}
                </pre>
            </span>

            <span
                onClick={toggleDefaultModulators}
                className={"default_modulators_button single_stat"}
            >
                <span className={"stat_span"}>
                    <label>{t("bankInfo.defaultModulators")}</label>
                    <pre className={"monospaced"}>
                        {bank.defaultModulators.length}
                    </pre>
                </span>
                <EditIcon />
            </span>

            <div className={"stat_group single_stat"}>
                <label>{t("bankInfo.instruments")}</label>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.count")}</label>
                    <pre className={"monospaced"}>
                        {bank.instruments.length}
                    </pre>
                </span>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.generatorCount")}</label>
                    <pre className={"monospaced"}>{instrumentGens}</pre>
                </span>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.modulatorCount")}</label>
                    <pre className={"monospaced"}>{instrumentMods}</pre>
                </span>
            </div>

            <div className={"stat_group single_stat"}>
                <label>{t("bankInfo.presets")}</label>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.count")}</label>
                    <pre className={"monospaced"}>{bank.presets.length}</pre>
                </span>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.generatorCount")}</label>
                    <pre className={"monospaced"}>{presetGens}</pre>
                </span>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.modulatorCount")}</label>
                    <pre className={"monospaced"}>{presetMods}</pre>
                </span>
            </div>

            <div className={"stat_group single_stat"}>
                <label>{t("bankInfo.samples")}</label>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.count")}</label>
                    <pre className={"monospaced"}>{bank.samples.length}</pre>
                </span>
                <span className={"stat_span"}>
                    <label>{t("bankInfo.compressed")}</label>
                    <pre className={"monospaced"}>
                        {compressed} (
                        {((compressed / bank.samples.length) * 100).toFixed(0)}
                        %)
                    </pre>
                </span>
            </div>

            <span className={"powered_by stat_span"}>
                <label>{t("poweredBy")}</label>
                <a
                    href="https://github.com/spessasus/spessasynth_core"
                    target={"_blank"}
                >
                    <pre className={"monospaced"}>spessasynth_core</pre>
                </a>
            </span>
        </div>
    );
}
