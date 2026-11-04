import "./bank_check.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankViews } from "../../core_backend/entity_views.ts";
import type { MirrorTarget } from "../../synth_host/bank_mirror.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { useEntityLookup } from "../../hooks/use_entity_lookup.ts";
import { createRemoveUnusedActions } from "../../core_backend/bank_maintenance.ts";
import { EditSampleAction } from "../../sample_editor/edit_sample_action.ts";
import { type BankIssue, checkBank, SF2_NAME_LENGTH } from "./check_bank.ts";

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
        case "nonLatin1Name": {
            return [issue.target];
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
 * Lists what in the bank is likely a mistake, with a way to each element and fixes where one
 * is clear.
 */
export function BankCheck() {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const views = useBankSnapshot(session.store, (s) => s.views);
    const lookup = useEntityLookup(session.store);
    const issues = useMemo(() => checkBank(views), [views]);

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

            case "nonLatin1Name": {
                return t("bankInfo.check.nonLatin1Name");
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
        const loopEnd = Math.min(sample.loopEnd, view.length);
        apply([
            new EditSampleAction(sample, "loopEnd", sample.loopEnd, loopEnd),
            new EditSampleAction(
                sample,
                "loopStart",
                sample.loopStart,
                Math.min(sample.loopStart, loopEnd)
            )
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
            <ul className={"bank_check_list"}>
                {issues.map((issue) => (
                    <li key={getIssueKey(issue)}>
                        <span>{describe(issue)}</span>
                        {getTargets(issue).map((target) => (
                            <button
                                type={"button"}
                                className={"plain_button monospaced"}
                                key={`${target.kind}-${target.id}`}
                                onClick={() => goTo(target)}
                            >
                                {getName(views, target)}
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
            </ul>
        </div>
    );
}
