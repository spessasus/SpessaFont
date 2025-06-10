import { midiControllers } from "spessasynth_core";
import "./controller.css";
import { MODULABLE_CCS } from "../../core_backend/midi_constants.ts";
import { useTranslation } from "react-i18next";
import { getCCLocale } from "../../locale/get_cc_locale.ts";
import { type Ref, useMemo } from "react";
import { ControllerKnob, type ControllerKnobRef } from "./controller_knob.tsx";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";

export function Controller({
    cc,
    setCC,
    engine,
    ref
}: {
    cc: midiControllers;
    setCC: (cc: midiControllers) => void;
    engine: AudioEngine;
    ref: Ref<ControllerKnobRef>;
}) {
    const { t } = useTranslation();
    const ccLocales = useMemo(
        () => MODULABLE_CCS.map((cc) => getCCLocale(cc, t)),
        [t]
    );

    return (
        <div className={"controller_wrapper"}>
            <select
                className={"pretty_input monospaced"}
                style={{
                    fontSize: "1rem",
                    width: "9ch"
                }}
                value={cc}
                onChange={(e) =>
                    setCC(
                        parseInt(e.target.value) ||
                            midiControllers.modulationWheel
                    )
                }
            >
                {MODULABLE_CCS.map((cc) => {
                    return (
                        <option key={cc} value={cc}>
                            {"CC#" +
                                cc.toString().padEnd(5, "\u00A0") +
                                " - " +
                                ccLocales[cc]}
                        </option>
                    );
                })}
            </select>
            <ControllerKnob cc={cc} engine={engine} ref={ref}></ControllerKnob>
        </div>
    );
}
