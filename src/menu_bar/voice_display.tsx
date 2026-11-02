import { useTranslation } from "react-i18next";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { getCanvasColor, useCanvas } from "../hooks/use_canvas.ts";

function VoiceCount() {
    const { t } = useTranslation();
    const voiceCount = useEngineStatus((s) => s.voiceCount);
    return (
        <div className="midi_voice_display">
            {t("menuBarLocale.voices")} {voiceCount}
        </div>
    );
}

function Oscilloscope() {
    const {
        audioEngine: { analyser }
    } = useAudioEngine();
    const canvasRef = useCanvas(
        (ctx, { width, height }) => {
            const samples = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(samples);
            ctx.lineWidth = 2;
            ctx.strokeStyle = getCanvasColor(ctx, "--font-color");
            ctx.beginPath();
            for (const [i, sample] of samples.entries()) {
                ctx.lineTo(
                    (i / samples.length) * width,
                    (sample / 255) * height
                );
            }
            ctx.stroke();
        },
        { isAnimated: true }
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
}

export function VoiceDisplay() {
    return (
        <div className={"flex_menu_bar voice_display"}>
            <VoiceCount />
            <Oscilloscope />
        </div>
    );
}
