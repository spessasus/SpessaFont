import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./piano_capture_bar.css";
import { useNextPlayedKeys } from "../keyboard/use_next_played_keys.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { BACK_LEVELS } from "./back_stack.ts";
import { PianoKeysIcon } from "../utils/icons/player_icons.tsx";

interface PianoCaptureBarProps {
    count: 1 | 2;
    prompt: string;
    onDone: (keys: readonly number[]) => void;
    onCancel: () => void;
}

/**
 * Waits for keys played on the keyboard's channel (the drawer or a MIDI input), mounted while a
 * capture runs. Unmounting ends it, so keys played later never reach `onDone`.
 */
export function PianoCaptureBar({
    count,
    prompt,
    onDone,
    onCancel
}: PianoCaptureBarProps) {
    const { t } = useTranslation();
    // Refs, as the engine's events of one batch arrive before React renders again
    const keys = useRef(new Array<number>());
    const finishedRef = useRef(false);
    const [playedCount, setPlayedCount] = useState(0);
    useNextPlayedKeys(1, ([key]) => {
        if (finishedRef.current) {
            return;
        }
        keys.current.push(key);
        setPlayedCount(keys.current.length);
        if (keys.current.length < count) {
            return;
        }
        // One capture, one result: later keys of the same batch are not applied
        finishedRef.current = true;
        onDone(keys.current);
    });
    useBackHandler(true, BACK_LEVELS.transient, () => {
        onCancel();
        return true;
    });
    useEventListener(globalThis, "keydown", (e) => {
        if (e.key !== "Escape") {
            return;
        }
        e.preventDefault();
        onCancel();
    });
    return (
        <div className={"piano_capture_bar"}>
            <span className={"piano_capture_icon"} aria-hidden={true}>
                <PianoKeysIcon />
            </span>
            <span className={"piano_capture_prompt"}>{prompt}</span>
            <span className={"piano_capture_progress"} role={"status"}>
                {t("phoneLocale.capture.progress", {
                    played: playedCount,
                    count
                })}
            </span>
            <button
                type={"button"}
                className={"pretty_button piano_capture_cancel"}
                onClick={onCancel}
            >
                {t("phoneLocale.capture.cancel")}
            </button>
        </div>
    );
}
