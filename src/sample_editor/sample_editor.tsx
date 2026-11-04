import type { BasicSample } from "spessasynth_core";
import "./sample_editor.css";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { WaveView } from "./wave_view/wave_view.tsx";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { SampleTools } from "./sample_tools.tsx";
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
/**
 * Shown until the audio is read.
 */
const NO_AUDIO = new Float32Array(0);

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
    const sampleViews = useBankSnapshot(session.store, (s) => s.views.samples);
    const sampleOrder = useBankSnapshot(
        session.store,
        (s) => s.views.sampleOrder
    );
    // In bank order, for the stereo link list
    const samples = useMemo(
        () =>
            sampleOrder.flatMap((id) => {
                const v = sampleViews.get(id);
                return v ? [v] : [];
            }),
        [sampleOrder, sampleViews]
    );
    if (!view) {
        // The pane is closed when its sample is removed, this only covers the render before
        return null;
    }
    return (
        <SampleEditorPane
            sample={sample}
            view={view}
            samples={samples}
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
    samples: readonly SampleView[];
}

function SampleEditorPane({
    sample,
    view,
    samples,
    playerState,
    playRequest,
    onPlayerStateChange,
    equalizer,
    onEqualizerChange
}: SampleEditorPaneProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const edits = useSampleEdits(sample, view);
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
            <WaveView
                zoom={zoom}
                onLoopStartChange={edits.setLoopStart}
                onLoopEndChange={edits.setLoopEnd}
                data={data ?? NO_AUDIO}
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
                        setValue={edits.setName}
                        value={view.name}
                        maxLength={MAX_NAME_LENGTH}
                        className={"pretty_input sample_name monospaced"}
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
                    samples={samples}
                    edits={edits}
                />
                <SampleTools
                    isLoading={audio.isLoading}
                    onExportWav={audio.exportWav}
                    onNormalize={audio.normalize}
                    onAutoLoop={audio.autoLoop}
                    onReplaceAudio={audio.replaceAudio}
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
