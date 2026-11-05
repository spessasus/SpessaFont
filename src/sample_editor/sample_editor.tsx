import type { BasicSample } from "spessasynth_core";
import "./sample_editor.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WaveView } from "./wave_view/wave_view.tsx";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { SampleToolsMenu } from "./sample_tools_menu.tsx";
import { SampleProperties } from "./sample_properties.tsx";
import { SamplePlayback } from "./sample_playback.tsx";
import { ZoomSlider } from "./zoom_slider.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useSampleView } from "../hooks/use_sample_view.ts";
import type { SampleView } from "../core_backend/entity_views.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { useSampleEdits } from "./use_sample_edits.ts";
import {
    type SamplePlayerState,
    useSamplePlayer
} from "./use_sample_player.ts";
import { useSampleAudioCommands } from "./use_sample_audio_commands.ts";
import { EqualizerPanel } from "./equalizer/equalizer_panel.tsx";
import { useEqualizerPreview } from "./equalizer/use_equalizer_preview.ts";
import { type EqualizerState, FLAT_EQUALIZER } from "./equalizer/equalizer.ts";
import { useSampleAudio } from "../hooks/use_sample_audio.ts";

const MAX_NAME_LENGTH = 40;

interface SampleEditorProps {
    sample: BasicSample;
    /**
     * Kept by the bank editor across samples, so the next sample plays the same way.
     */
    playerState: SamplePlayerState;
    /**
     * Changes when the sample list asks to play the sample from the start.
     */
    playRequest: number;
    onPlayerStateChange: (state: SamplePlayerState) => void;
    /**
     * Kept by the bank editor too, so the same settings can go to the next sample.
     */
    equalizer: EqualizerState;
    onEqualizerChange: (state: EqualizerState) => void;
}

/**
 * The editor pane is remounted for each sample (see `BankEditor`), so zoom and playback start
 * fresh without resetting them by hand.
 */
export function SampleEditor({
    sample,
    playerState,
    playRequest,
    onPlayerStateChange,
    equalizer,
    onEqualizerChange
}: SampleEditorProps) {
    const { session } = useBankEditor();
    const sampleId = getObjectId(sample);
    const view = useSampleView(session.store, sampleId);
    if (!view) {
        // The pane is closed when its sample is removed, this only covers the render before
        return null;
    }
    return (
        <SampleEditorPane
            sample={sample}
            view={view}
            playerState={playerState}
            playRequest={playRequest}
            onPlayerStateChange={onPlayerStateChange}
            equalizer={equalizer}
            onEqualizerChange={onEqualizerChange}
        />
    );
}

interface SampleEditorPaneProps extends SampleEditorProps {
    view: SampleView;
}

/**
 * Whether a sample other than the sample's partner is free to pair with it.
 */
function hasFreeSample(
    samples: ReadonlyMap<number, SampleView>,
    view: SampleView
) {
    for (const other of samples.values()) {
        if (
            other.id !== view.id &&
            other.id !== view.linkedSampleId &&
            (other.linkedSampleId === undefined ||
                other.linkedSampleId === view.id)
        ) {
            return true;
        }
    }
    return false;
}

function SampleEditorPane({
    sample,
    view,
    playerState,
    playRequest,
    onPlayerStateChange,
    equalizer,
    onEqualizerChange
}: SampleEditorPaneProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const edits = useSampleEdits(sample, view);
    // Primitives, so other samples' edits only re-render the pane when these change
    const partnerName = useBankSnapshot(session.store, (s) =>
        view.linkedSampleId === undefined
            ? undefined
            : s.views.samples.get(view.linkedSampleId)?.name
    );
    const canLink = useBankSnapshot(session.store, (s) =>
        hasFreeSample(s.views.samples, view)
    );
    const data = useSampleAudio(session, view.id);
    const player = useSamplePlayer(
        view,
        data,
        playerState,
        playRequest,
        onPlayerStateChange
    );
    useEqualizerPreview(
        equalizer.isPreviewing ? equalizer.settings : FLAT_EQUALIZER,
        view.sampleRate
    );
    const audio = useSampleAudioCommands(sample, player.stop);
    const [zoom, setZoom] = useState(1);

    return (
        <div className={"sample_editor"}>
            <SampleToolsMenu
                isLoading={audio.isLoading}
                hasLoop={view.loopEnd > view.loopStart}
                onExportWav={audio.exportWav}
                onNormalize={audio.normalize}
                onAutoLoop={audio.autoLoop}
                onRemoveSilence={audio.removeSilence}
                onTrimAfterLoop={audio.trimAfterLoop}
                onReplaceAudio={audio.replaceAudio}
            />
            <WaveView
                zoom={zoom}
                onLoopStartChange={edits.setLoopStart}
                onLoopEndChange={edits.setLoopEnd}
                data={data}
                loopStart={view.loopStart}
                loopEnd={view.loopEnd}
                sampleRate={view.sampleRate}
                playerState={player.state}
                playbackStartTime={player.startTime}
                centCorrection={view.pitchCorrection}
            />
            <div className={"sample_editor_toolbar"}>
                <div className={"sample_editor_title"}>
                    <WaitingInput
                        onCommit={edits.setName}
                        value={view.name}
                        maxLength={MAX_NAME_LENGTH}
                        className={"pretty_input sample_editor_name monospaced"}
                        placeholder={t("sampleLocale.sampleName")}
                        aria-label={t("sampleLocale.sampleName")}
                    />
                    <SamplePlayback
                        state={player.state}
                        onPlay={player.play}
                        onStop={player.stop}
                    />
                </div>
                <ZoomSlider
                    sampleLength={view.length}
                    zoom={zoom}
                    onZoomChange={setZoom}
                />
            </div>
            <div className={"sample_editor_panels"}>
                <SampleProperties
                    sample={view}
                    partnerName={partnerName}
                    canLink={canLink}
                    edits={edits}
                />
                <EqualizerPanel
                    state={equalizer}
                    sampleRate={view.sampleRate}
                    isDisabled={audio.isLoading}
                    onStateChange={onEqualizerChange}
                    onApply={() => {
                        void audio.equalize(equalizer.settings);
                        // The audio now has the changes, previewing would apply them twice
                        onEqualizerChange({
                            ...equalizer,
                            isPreviewing: false
                        });
                    }}
                />
            </div>
            <LinkedInstruments sampleId={getObjectId(sample)} />
        </div>
    );
}
