import { useTranslation } from "react-i18next";
import "./stats.css";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { EditIcon } from "../utils/icons/edit_icons.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { InfoIcon } from "../utils/icons/file_icons.tsx";
import type { InfoPanel } from "./info_panel.ts";

/**
 * Counts the generators and modulators of all zones, including the global ones.
 */
function countZoneData(
    elements: Iterable<{
        readonly globalZone: ZoneView;
        readonly zones: readonly ZoneView[];
    }>
) {
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

function getPercent(part: number, total: number) {
    if (total === 0) {
        return 0;
    }
    const percent = Math.round((part / total) * 100);
    // A few out of many still show above 0%, and all but a few below 100%
    return part > 0 && part < total
        ? Math.min(Math.max(percent, 1), 99)
        : percent;
}

interface BankInfoStatsProps {
    issueCount: number;
    panel: InfoPanel;
    onTogglePanel: (panel: InfoPanel) => void;
}

export function BankInfoStats({
    issueCount,
    panel,
    onTogglePanel
}: BankInfoStatsProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const views = useBankSnapshot(session.store, (s) => s.views);
    const info = useBankSnapshot(session.store, (s) => s.info);

    const instrumentData = countZoneData(views.instruments.values());
    const presetData = countZoneData(views.presets.values());
    let compressed = 0;
    for (const sample of views.samples.values()) {
        if (sample.isCompressed) {
            compressed++;
        }
    }
    const sampleCount = views.sampleOrder.length;
    const compressedPercent = getPercent(compressed, sampleCount);
    const { version, soundEngine, software = "" } = info;
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
                aria-pressed={panel === "modulators"}
                onClick={() => onTogglePanel("modulators")}
                className={"stats_panel_button single_stat"}
            >
                <Stat
                    label={t("bankInfo.defaultModulators")}
                    value={views.defaultModulators.length}
                />
                <EditIcon />
            </button>

            <button
                type={"button"}
                aria-pressed={panel === "check"}
                onClick={() => onTogglePanel("check")}
                className={"stats_panel_button single_stat"}
            >
                <Stat label={t("bankInfo.checkButton")} value={issueCount} />
                <InfoIcon />
            </button>

            <div className={"stat_group single_stat"}>
                <span className={"stat_label"}>
                    {t("bankInfo.instruments")}
                </span>
                <Stat
                    label={t("bankInfo.count")}
                    value={views.instrumentOrder.length}
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
                <Stat
                    label={t("bankInfo.count")}
                    value={views.presetOrder.length}
                />
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
                <Stat label={t("bankInfo.count")} value={sampleCount} />
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
