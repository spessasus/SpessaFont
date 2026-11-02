import type { BasicSample } from "spessasynth_core";
import "./sample_editor.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WaveView } from "./wave_view/wave_view.tsx";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { SampleTools } from "./sample_tools.tsx";
import { SampleProperties } from "./sample_properties.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../hooks/use_entity_revision.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { useSampleEdits } from "./use_sample_edits.ts";
import {
    type SamplePlayerState,
    useSamplePlayer
} from "./use_sample_player.ts";

const MAX_NAME_LENGTH = 40;

interface SampleEditorProps {
    sample: BasicSample;
    /**
     * Kept by the bank editor across samples, so the next sample plays the same way.
     */
    playerState: SamplePlayerState;
    onPlayerStateChange: (state: SamplePlayerState) => void;
}

/**
 * The editor pane is remounted for each sample (see `BankEditor`), so zoom and playback start
 * fresh without resetting them by hand.
 */
export function SampleEditor({
    sample,
    playerState,
    onPlayerStateChange
}: SampleEditorProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    // Re-render when the sample's audio, properties, or links change
    useEntityRevision(session.store, sample);
    const edits = useSampleEdits(sample);
    const player = useSamplePlayer(sample, playerState, onPlayerStateChange);
    const [zoom, setZoom] = useState(1);

    return (
        <div className={"sample_editor"}>
            <WaveView
                zoom={zoom}
                onLoopStartChange={edits.setLoopStart}
                onLoopEndChange={edits.setLoopEnd}
                data={sample.getAudioData()}
                loopStart={sample.loopStart}
                loopEnd={sample.loopEnd}
                sampleRate={sample.sampleRate}
                playerState={player.state}
                playbackStartTime={player.startTime}
                centCorrection={sample.pitchCorrection}
            />
            <div className={"info_column"}>
                <WaitingInput
                    setValue={edits.setName}
                    value={sample.name}
                    maxLength={MAX_NAME_LENGTH}
                    className={"pretty_input sample_name monospaced"}
                    placeholder={t("sampleLocale.sampleName")}
                    aria-label={t("sampleLocale.sampleName")}
                />
                <div className={"info_split"}>
                    <SampleProperties
                        sample={sample}
                        samples={samples}
                        edits={edits}
                    />
                    <SampleTools
                        sample={sample}
                        player={player}
                        zoom={zoom}
                        onZoomChange={setZoom}
                    />
                </div>
                <LinkedInstruments sample={sample} />
            </div>
        </div>
    );
}
