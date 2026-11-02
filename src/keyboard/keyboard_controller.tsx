import "./keyboard_controller.css";
import { Keyboard } from "./keyboard/keyboard.tsx";
import { memo, useState } from "react";
import { type MIDIController, MIDIControllers } from "spessasynth_core";
import { Controller } from "./controller/controller.tsx";
import { OtherControllers } from "./controller/other_controllers.tsx";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useViewSplits } from "./use_view_splits.ts";

const INITIAL_CC_LIST: readonly MIDIController[] = [
    MIDIControllers.modulationWheel,
    MIDIControllers.mainVolume,
    MIDIControllers.pan,
    MIDIControllers.expression,
    MIDIControllers.sustainPedal,
    MIDIControllers.filterResonance,
    MIDIControllers.brightness,

    MIDIControllers.reverbDepth,
    MIDIControllers.chorusDepth
];

const NUMBER_WIDTH = 3;

/**
 * Memoized (it has no props) so moving the pointer over the keyboard does not re-render the
 * controller selects with their 128 options each.
 */
const ControllerKnobs = memo(function ControllerKnobs() {
    const [controllers, setControllers] = useState(INITIAL_CC_LIST);
    return (
        <div className={"controller_row"}>
            {controllers.map((cc, i) => (
                <Controller
                    // A fixed set of slots, never reordered, so the slot is the identity
                    key={i}
                    number={i + 1}
                    cc={cc}
                    setCC={(newCC) =>
                        setControllers((prev) => prev.with(i, newCC))
                    }
                />
            ))}
        </div>
    );
});

const MemoOtherControllers = memo(OtherControllers);

interface KeyboardControllerProps {
    /**
     * The tab whose shown element decides the highlighted key ranges, if any.
     */
    session: BankSession | undefined;
    view: BankEditView;
}

export function KeyboardController({ session, view }: KeyboardControllerProps) {
    const { t } = useTranslation();
    const splits = useViewSplits(session, view);
    const [hoveredKey, setHoveredKey] = useState({
        midiNote: 127,
        velocity: 127
    });

    return (
        <div className={"keyboard_controller"}>
            <div className={"keyboard_controller_scroll"}>
                <Keyboard
                    splits={splits}
                    onKeyHover={(midiNote, velocity) =>
                        setHoveredKey((prev) =>
                            prev.midiNote === midiNote &&
                            prev.velocity === velocity
                                ? prev
                                : { midiNote, velocity }
                        )
                    }
                />
                <div className={"controller_row_scroll"}>
                    <div className={"controller_row controller_row_main"}>
                        <MemoOtherControllers />
                        <ControllerKnobs />
                        <div className={"controller_column"}>
                            <div>
                                <span>{t("keyboardLocale.midiKey")}</span>
                                <span className={"monospaced number_display"}>
                                    {hoveredKey.midiNote
                                        .toString()
                                        .padStart(NUMBER_WIDTH, " ")}
                                </span>
                            </div>

                            <div>
                                <span>{t("keyboardLocale.velocity")}</span>
                                <span className={"monospaced number_display"}>
                                    {hoveredKey.velocity
                                        .toString()
                                        .padStart(NUMBER_WIDTH, " ")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
