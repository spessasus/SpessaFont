import type { SpessaSynthProcessor } from "spessasynth_core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

        analyser.fftSize = 1024;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();

        return () => {};
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
            <canvas ref={canvasRef} width={100} height={50} />
        </div>
    );
}
