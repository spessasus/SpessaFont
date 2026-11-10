import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./piano_capture_bar.css";
import { useNextPlayedKeys } from "../keyboard/use_next_played_keys.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { BACK_LEVELS } from "./back_stack.ts";
import { PianoKeysIcon } from "../utils/icons/player_icons.tsx";
import { useIsEditorCovered } from "./use_is_editor_covered.ts";

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
    // The open portrait lists hide the capture, so their keys are an audition and back closes
    // them first. The capture goes on once they close
    const isCovered = useIsEditorCovered();
    useNextPlayedKeys(1, ([key]) => {
        if (isCovered || finishedRef.current) {
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
    useBackHandler(!isCovered, BACK_LEVELS.transient, () => {
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
        <div
            className={"piano_capture_bar"}
            // Starts in view, it may mount below the visible part of a scrolled sheet
            ref={(bar) => {
                bar?.scrollIntoView({ block: "nearest" });
            }}
        >
            <span className={"piano_capture_icon"} aria-hidden={true}>
                <PianoKeysIcon />
            </span>
            <span className={"piano_capture_prompt"}>{prompt}</span>
            {/* One key needs no count */}
            {count > 1 ? (
                <span className={"piano_capture_progress"} role={"status"}>
                    {t("phoneLocale.capture.progress", {
                        played: playedCount,
                        count
                    })}
                </span>
            ) : null}
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
