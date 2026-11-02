import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";

const CANVAS_WIDTH = 100;
const CANVAS_HEIGHT = 50;

function VoiceCount() {
    const { t } = useTranslation();
    const voiceCount = useEngineStatus((s) => s.voiceCount);
    return (
        <div className="midi_voice_display">
            {t("menuBarLocale.voices")} {voiceCount}
        </div>
    );
}

export function VoiceDisplay() {
    const {
        audioEngine: { analyser }
    } = useAudioEngine();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) {
            return;
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        let frame = 0;
        const draw = () => {
            frame = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(0, (dataArray[0] / 255) * CANVAS_HEIGHT);

            for (let i = 0; i < dataArray.length; i++) {
                const val = dataArray[i] / 255;
                const xPos = CANVAS_WIDTH * (i / dataArray.length);
                ctx.lineTo(xPos, val * CANVAS_HEIGHT);
            }

            ctx.stroke();
        };

        draw();
        return () => cancelAnimationFrame(frame);
    }, [analyser]);

    return (
        <div className={"flex_menu_bar voice_display"}>
            <VoiceCount />
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
            />
        </div>
    );
}
