import "./keyboard_controller.css";
import { Keyboard } from "./keyboard/keyboard.tsx";
import { useState } from "react";
import { OtherControllers } from "./controller/other_controllers.tsx";
import { ControllerKnobs } from "./controller/controller_knobs.tsx";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useViewSplits } from "./use_view_splits.ts";

const NUMBER_WIDTH = 3;

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
                        <OtherControllers />
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
