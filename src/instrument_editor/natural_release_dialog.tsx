import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToolDialog } from "../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../dialogs/dialog_number_field.tsx";
import { readNumberField } from "../dialogs/read_number_field.ts";
import {
    type NaturalRelease,
    RELEASE_REFERENCE_KEY
} from "./natural_release_actions.ts";

interface NaturalReleaseDialogProps {
    /**
     * How many zones play a modulation envelope (their own or the global one), which a
     * detune replaces.
     */
    modEnvelopeZones: number;
    onAnswer: (release: NaturalRelease | undefined) => void;
}

/**
 * Asks for the release at the reference key, how it changes per octave, and a detune.
 */
export function NaturalReleaseDialog({
    modEnvelopeZones,
    onAnswer
}: NaturalReleaseDialogProps) {
    const { t } = useTranslation();
    const [secondsText, setSecondsText] = useState("1");
    const [factorText, setFactorText] = useState("0.75");
    const [detuneText, setDetuneText] = useState("0");
    const seconds = readNumberField(secondsText, 0.001, 100);
    const factorPerOctave = readNumberField(factorText, 0.1, 10);
    const detune = readNumberField(detuneText, -1200, 1200);

    return (
        <ToolDialog
            title={t("toolsLocale.naturalRelease.title")}
            canApply={
                seconds !== undefined &&
                factorPerOctave !== undefined &&
                detune !== undefined
            }
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (
                    seconds !== undefined &&
                    factorPerOctave !== undefined &&
                    detune !== undefined
                ) {
                    onAnswer({
                        seconds,
                        factorPerOctave,
                        detune: Math.round(detune)
                    });
                }
            }}
        >
            <DialogNumberField
                label={t("toolsLocale.naturalRelease.seconds", {
                    key: RELEASE_REFERENCE_KEY
                })}
                value={secondsText}
                min={0.001}
                max={100}
                step={0.01}
                onChange={setSecondsText}
            />
            <DialogNumberField
                label={t("toolsLocale.naturalRelease.factor")}
                value={factorText}
                min={0.1}
                max={10}
                step={0.05}
                onChange={setFactorText}
            />
            <DialogNumberField
                label={t("toolsLocale.naturalRelease.detune")}
                value={detuneText}
                min={-1200}
                max={1200}
                step={1}
                onChange={setDetuneText}
            />
            <p className={"tool_dialog_note"}>
                {t("toolsLocale.naturalRelease.explanation")}
            </p>
            {detune !== undefined && detune !== 0 && modEnvelopeZones > 0 ? (
                <p className={"tool_dialog_note"}>
                    {t("toolsLocale.naturalRelease.overwriteWarning", {
                        count: modEnvelopeZones
                    })}
                </p>
            ) : null}
        </ToolDialog>
    );
}
