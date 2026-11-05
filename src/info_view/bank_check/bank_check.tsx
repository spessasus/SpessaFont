import "./bank_check.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankViews } from "../../core_backend/entity_views.ts";
import type { MirrorTarget } from "../../synth_host/bank_mirror.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { useEntityLookup } from "../../hooks/use_entity_lookup.ts";
import { createRemoveUnusedActions } from "../../core_backend/bank_maintenance.ts";
import { EditSampleAction } from "../../sample_editor/edit_sample_action.ts";
import {
    type BankIssue,
    EXTENDED_NAME_LENGTH,
    getFixedLoop,
    SF2_NAME_LENGTH
} from "./check_bank.ts";

type IssueKind = BankIssue["kind"];

/**
 * A kind with thousands of issues (every sample of a converted bank) shows this many until the
 * user asks for all of them.
 */
const SHOWN_PER_KIND = 50;

function getName(views: BankViews, target: MirrorTarget) {
    switch (target.kind) {
        case "preset": {
            return views.presets.get(target.id)?.name ?? "";
        }

        case "instrument": {
            return views.instruments.get(target.id)?.name ?? "";
        }

        case "sample": {
            return views.samples.get(target.id)?.name ?? "";
        }
    }
}

/**
 * The elements an issue is about, each with a "go to" button.
 */
function getTargets(issue: BankIssue): MirrorTarget[] {
    switch (issue.kind) {
        case "duplicatePatch": {
            return issue.presetIds.map((id) => ({ kind: "preset", id }));
        }

        case "duplicateZone":
        case "emptyElement":
        case "longName":
        case "cutName":
        case "nonLatin1Name":
        case "sfeOnlyData":
        case "linkedModulator": {
            return [issue.target];
        }

        case "bankNumberLost": {
            return [{ kind: "preset", id: issue.presetId }];
        }

        case "unusedInstrument": {
            return [{ kind: "instrument", id: issue.instrumentId }];
        }

        case "unusedSample":
        case "loopOutside": {
            return [{ kind: "sample", id: issue.sampleId }];
        }

        case "stereoMismatch": {
            return [
                { kind: "sample", id: issue.sampleId },
                { kind: "sample", id: issue.partnerId }
            ];
        }

        case "nonLatin1Info":
        case "sfeDefaultModulators": {
            return [];
        }
    }
}

/**
 * An issue is one kind of problem of its elements, which makes it unique.
 */
function getIssueKey(issue: BankIssue) {
    const ids = getTargets(issue).map((target) => target.id);
    return `${issue.kind}-${ids.join("-")}`;
}

/**
 * The issues of each kind, the kinds in the order they are first found.
 */
function groupByKind(issues: readonly BankIssue[]) {
    const groups = new Map<IssueKind, BankIssue[]>();
    for (const issue of issues) {
        const group = groups.get(issue.kind);
        if (group) {
            group.push(issue);
        } else {
            groups.set(issue.kind, [issue]);
        }
    }
    return groups;
}

interface BankCheckProps {
    issues: readonly BankIssue[];
}

/**
 * Lists what in the bank is likely a mistake, with a way to each element and fixes where one
 * is clear.
 */
export function BankCheck({ issues }: BankCheckProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const views = useBankSnapshot(session.store, (s) => s.views);
    const lookup = useEntityLookup(session.store);
    const [expandedKinds, setExpandedKinds] = useState<ReadonlySet<IssueKind>>(
        new Set()
    );

    // The elements' names are on their buttons, so the text only says what is wrong
    const describe = (issue: BankIssue) => {
        switch (issue.kind) {
            case "duplicatePatch": {
                return t("bankInfo.check.duplicatePatch", {
                    patch: issue.patch
                });
            }

            case "duplicateZone": {
                return t("bankInfo.check.duplicateZone", {
                    zone: issue.zoneName
                });
            }

            case "emptyElement": {
                return t("bankInfo.check.emptyElement");
            }

            case "unusedInstrument": {
                return t("bankInfo.check.unusedInstrument");
            }

            case "unusedSample": {
                return t("bankInfo.check.unusedSample");
            }

            case "loopOutside": {
                return t("bankInfo.check.loopOutside");
            }

            case "stereoMismatch": {
                switch (issue.reason) {
                    case "oneSided": {
                        return t("bankInfo.check.stereoOneSided");
                    }

                    case "rate": {
                        return t("bankInfo.check.stereoRate");
                    }

                    case "length": {
                        return t("bankInfo.check.stereoLength");
                    }
                }
                break;
            }

            case "longName": {
                return t("bankInfo.check.longName", {
                    length: SF2_NAME_LENGTH
                });
            }

            case "cutName": {
                return t("bankInfo.check.cutName", {
                    length: EXTENDED_NAME_LENGTH
                });
            }

            case "nonLatin1Name": {
                return t("bankInfo.check.nonLatin1Name");
            }

            case "nonLatin1Info": {
                return t("bankInfo.check.nonLatin1Info");
            }

            case "bankNumberLost": {
                return t("bankInfo.check.bankNumberLost");
            }

            case "sfeOnlyData": {
                return t("bankInfo.check.sfeOnlyData");
            }

            case "sfeDefaultModulators": {
                return t("bankInfo.check.sfeDefaultModulators");
            }

            case "linkedModulator": {
                return t("bankInfo.check.linkedModulator");
            }
        }
    };

    const goTo = (target: MirrorTarget) => {
        const element =
            target.kind === "preset"
                ? lookup.preset(target.id)
                : target.kind === "instrument"
                  ? lookup.instrument(target.id)
                  : lookup.sample(target.id);
        if (element) {
            setView(element);
        }
    };

    const fixLoop = (sampleId: number) => {
        const sample = lookup.sample(sampleId);
        const view = views.samples.get(sampleId);
        if (!sample || !view) {
            return;
        }
        const { start, end } = getFixedLoop(
            sample.loopStart,
            sample.loopEnd,
            view.length
        );
        apply([
            new EditSampleAction(sample, "loopStart", sample.loopStart, start),
            new EditSampleAction(sample, "loopEnd", sample.loopEnd, end)
        ]);
    };

    const removeUnused = () => {
        const { actions, instrumentCount, sampleCount } =
            createRemoveUnusedActions(session.document);
        // Run without the focus hint, so the overview stays shown
        session.history.do(actions);
        toast.success(
            t("soundBankLocale.removedElements", {
                instruments: instrumentCount,
                samples: sampleCount
            })
        );
    };

    const hasUnused = issues.some(
        (i) => i.kind === "unusedInstrument" || i.kind === "unusedSample"
    );
    const groups = groupByKind(issues);
    return (
        <div className={"bank_check"}>
            <h2 className={"bank_check_title"}>
                {t("bankInfo.check.title", { count: issues.length })}
            </h2>
            {issues.length === 0 ? <p>{t("bankInfo.check.noIssues")}</p> : null}
            {hasUnused ? (
                <button
                    type={"button"}
                    className={"pretty_button responsive_button"}
                    onClick={removeUnused}
                >
                    {t("menuBarLocale.edit.removeUnusedElements")}
                </button>
            ) : null}
            {Array.from(groups, ([kind, group]) => {
                const shown = expandedKinds.has(kind)
                    ? group
                    : group.slice(0, SHOWN_PER_KIND);
                return (
                    <ul className={"bank_check_list"} key={kind}>
                        {shown.map((issue) => (
                            <li key={getIssueKey(issue)}>
                                <span>{describe(issue)}</span>
                                {getTargets(issue).map((target) => (
                                    <button
                                        type={"button"}
                                        className={"plain_button monospaced"}
                                        key={`${target.kind}-${target.id}`}
                                        onClick={() => goTo(target)}
                                    >
                                        {getName(views, target) ||
                                            t("bankInfo.unnamed")}
                                    </button>
                                ))}
                                {issue.kind === "loopOutside" ? (
                                    <button
                                        type={"button"}
                                        className={"plain_button"}
                                        onClick={() => fixLoop(issue.sampleId)}
                                    >
                                        {t("bankInfo.check.fixLoop")}
                                    </button>
                                ) : null}
                            </li>
                        ))}
                        {group.length > shown.length ? (
                            <li>
                                <button
                                    type={"button"}
                                    className={"plain_button"}
                                    onClick={() =>
                                        setExpandedKinds(
                                            (kinds) => new Set([...kinds, kind])
                                        )
                                    }
                                >
                                    {t("bankInfo.check.showAll", {
                                        count: group.length
                                    })}
                                </button>
                            </li>
                        ) : null}
                    </ul>
                );
            })}
        </div>
    );
}
