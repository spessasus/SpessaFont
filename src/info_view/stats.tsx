import { useTranslation } from "react-i18next";
import type { BasicInstrument, BasicPreset } from "spessasynth_core";
import "./stats.css";
import { EditIcon } from "../utils/icons.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";

/**
 * Counts the generators and modulators of all zones, including the global ones.
 */
function countZoneData(elements: readonly (BasicPreset | BasicInstrument)[]) {
    let generators = 0;
    let modulators = 0;
    for (const element of elements) {
        for (const zone of [element.globalZone, ...element.zones]) {
            generators += zone.generators.length;
            modulators += zone.modulators.length;
        }
    }
    return { generators, modulators };
}

interface StatProps {
    label: string;
    value: string | number;
    className?: string;
}

function Stat({ label, value, className = "" }: StatProps) {
    return (
        <span className={`stat_span ${className}`}>
            <span className={"stat_label"}>{label}</span>
            <pre className={"monospaced"}>{value}</pre>
        </span>
    );
}

interface BankInfoStatsProps {
    onToggleDefaultModulators: () => void;
}

export function BankInfoStats({
    onToggleDefaultModulators
}: BankInfoStatsProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    // The counts below read the mutable bank, so re-render on every change
    useBankSnapshot(session.store, (s) => s.revision);
    const bank = session.document.bank;

    const instrumentData = countZoneData(bank.instruments);
    const presetData = countZoneData(bank.presets);
    const compressed = bank.samples.filter((s) => s.isCompressed).length;
    const compressedPercent =
        bank.samples.length > 0
            ? Math.round((compressed / bank.samples.length) * 100)
            : 0;
    const { version, soundEngine, software = "" } = bank.soundBankInfo;
    const versionString = `${version.major}.${version.minor.toString().padStart(2, "0")}`;

    return (
        <div className={"stats"}>
            <h1>{t("bankInfo.stats")}</h1>
            <Stat
                className={"single_stat"}
                label={t("bankInfo.version")}
                value={versionString}
            />
            <Stat
                className={"single_stat"}
                label={t("bankInfo.engine")}
                value={soundEngine}
            />
            <Stat
                className={"single_stat"}
                label={t("bankInfo.software")}
                value={software}
            />

            <button
                type={"button"}
                onClick={onToggleDefaultModulators}
                className={"default_modulators_button single_stat"}
            >
                <Stat
                    label={t("bankInfo.defaultModulators")}
                    value={bank.defaultModulators.length}
                />
                <EditIcon />
            </button>

            <div className={"stat_group single_stat"}>
                <span className={"stat_label"}>
                    {t("bankInfo.instruments")}
                </span>
                <Stat
                    label={t("bankInfo.count")}
                    value={bank.instruments.length}
                />
                <Stat
                    label={t("bankInfo.generatorCount")}
                    value={instrumentData.generators}
                />
                <Stat
                    label={t("bankInfo.modulatorCount")}
                    value={instrumentData.modulators}
                />
            </div>

            <div className={"stat_group single_stat"}>
                <span className={"stat_label"}>{t("bankInfo.presets")}</span>
                <Stat label={t("bankInfo.count")} value={bank.presets.length} />
                <Stat
                    label={t("bankInfo.generatorCount")}
                    value={presetData.generators}
                />
                <Stat
                    label={t("bankInfo.modulatorCount")}
                    value={presetData.modulators}
                />
            </div>

            <div className={"stat_group single_stat"}>
                <span className={"stat_label"}>{t("bankInfo.samples")}</span>
                <Stat label={t("bankInfo.count")} value={bank.samples.length} />
                <Stat
                    label={t("bankInfo.compressed")}
                    value={`${compressed} (${compressedPercent}%)`}
                />
            </div>

            <span className={"powered_by stat_span"}>
                <span className={"stat_label"}>{t("poweredBy")}</span>
                <a
                    href="https://github.com/spessasus/spessasynth_core"
                    target={"_blank"}
                    rel={"noreferrer"}
                >
                    <pre className={"monospaced"}>spessasynth_core</pre>
                </a>
            </span>
        </div>
    );
}
