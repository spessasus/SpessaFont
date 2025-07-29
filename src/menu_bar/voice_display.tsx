import type { SpessaSynthProcessor } from "spessasynth_core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const CANVAS_WIDTH = 100;
const CANVAS_HEIGHT = 50;
const FFT_SIZE = 1024;

export function VoiceDisplay({
    analyser,
    processor
}: {
    analyser: AnalyserNode;
    processor: SpessaSynthProcessor;
}) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }

        analyser.fftSize = FFT_SIZE;
        const bufferLength = analyser.frequencyBinCount; // frequencyBinCount = fftSize / 2
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);

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
    }, [analyser]);

    function VoiceDisplay() {
        const [voices, setVoices] = useState(processor.totalVoicesAmount);

        useEffect(() => {
            const interval = setInterval(() => {
                setVoices(processor.totalVoicesAmount);
            }, 300);

            return () => clearInterval(interval);
        }, []);

        return (
            <div className="midi_voice_display">
                {t("menuBarLocale.voices")} {voices}
            </div>
        );
    }

    return (
        <div className={"flex_menu_bar voice_display"}>
            <VoiceDisplay />
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
            />
        </div>
    );
}
