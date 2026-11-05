import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SamplePlayerState } from "./use_sample_player.ts";
import { LoopIcon, PlayIcon, StopIcon } from "../utils/icons/player_icons.tsx";

interface PlaybackButtonProps {
    icon: ReactNode;
    label: string;
    stopLabel: string;
    isActive: boolean;
    onClick: () => void;
}

/**
 * Both labels share one grid cell and the inactive one is only hidden,
 * so the button keeps the width of the longer one when it turns into stop.
 */
function PlaybackButton({
    icon,
    label,
    stopLabel,
    isActive,
    onClick
}: PlaybackButtonProps) {
    return (
        <button
            type={"button"}
            className={"pretty_button responsive_button hover_brightness"}
            // Not aria-pressed, the label already says "Stop" while it plays
            data-active={isActive}
            onClick={onClick}
        >
            {isActive ? <StopIcon /> : icon}
            <span className={"sample_playback_label"}>
                <span data-hidden={isActive}>{label}</span>
                <span data-hidden={!isActive}>{stopLabel}</span>
            </span>
        </button>
    );
}

interface SamplePlaybackProps {
    state: SamplePlayerState;
    onPlay: (isLooped: boolean) => void;
    onStop: () => void;
}

/**
 * Play once and play looped. The button of the running mode turns into stop,
 * the other one switches to its mode.
 */
export function SamplePlayback({ state, onPlay, onStop }: SamplePlaybackProps) {
    const { t } = useTranslation();
    const isPlaying = state === "playing";
    const isLooping = state === "playing_loop";
    return (
        <div className={"sample_playback"}>
            <PlaybackButton
                icon={<PlayIcon />}
                label={t("sampleLocale.tools.play")}
                stopLabel={t("sampleLocale.tools.stop")}
                isActive={isPlaying}
                onClick={() => (isPlaying ? onStop() : onPlay(false))}
            />
            <PlaybackButton
                icon={<LoopIcon />}
                label={t("sampleLocale.tools.playLooped")}
                stopLabel={t("sampleLocale.tools.stop")}
                isActive={isLooping}
                onClick={() => (isLooping ? onStop() : onPlay(true))}
            />
        </div>
    );
}
