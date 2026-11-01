import { useTranslation } from "react-i18next";
import { type InterpolationType, InterpolationTypes } from "spessasynth_core";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import {
    clampSetting,
    type SavedSettingsType
} from "../save_load/settings_typedef.ts";
import { Setting } from "../setting.tsx";

export interface GroupSettingsProps {
    settings: SavedSettingsType;
    onChange: (changes: Partial<SavedSettingsType>) => void;
}

export function AudioEngineSettings({
    onChange,
    settings
}: GroupSettingsProps) {
    function setInterpolation(t: InterpolationType) {
        onChange({ interpolation: t });
    }

    // The percentage inputs show the gain times 100
    function setVolume(v: number) {
        const volume = clampSetting("volume", v / 100);
        onChange({ volume });
        return volume * 100;
    }

    function setReverb(v: number) {
        const reverbLevel = clampSetting("reverbLevel", v / 100);
        onChange({ reverbLevel });
        return reverbLevel * 100;
    }

    function setChorus(v: number) {
        const chorusLevel = clampSetting("chorusLevel", v / 100);
        onChange({ chorusLevel });
        return chorusLevel * 100;
    }

    function setDelay(v: number) {
        const delayLevel = clampSetting("delayLevel", v / 100);
        onChange({ delayLevel });
        return delayLevel * 100;
    }

    function setVelocitySenseDepth(v: number) {
        const velocitySenseDepth = clampSetting("velocitySenseDepth", v);
        onChange({ velocitySenseDepth });
        return velocitySenseDepth;
    }

    function setVelocitySenseOffset(v: number) {
        const velocitySenseOffset = clampSetting("velocitySenseOffset", v);
        onChange({ velocitySenseOffset });
        return velocitySenseOffset;
    }

    function setVoiceCap(v: number) {
        const voiceCap = clampSetting("voiceCap", Math.round(Math.abs(v)));
        onChange({ voiceCap });
        return voiceCap;
    }

    function setSampleRate(v: number) {
        const sampleRate = clampSetting("sampleRate", Math.round(v));
        onChange({ sampleRate });
        return sampleRate;
    }

    const { t } = useTranslation();
    const engineT = "settingsLocale.audioEngine.";
    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t(`${engineT}title`)}</h2>
            <Setting locale={`${engineT}sampleRate`}>
                <WaitingInput
                    setValue={setSampleRate}
                    type={"text"}
                    maxLength={8}
                    className={"pretty_input monospaced"}
                    suffix={"Hz"}
                    value={settings.sampleRate}
                />
            </Setting>
            <Setting locale={`${engineT}volume`}>
                <WaitingInput
                    setValue={setVolume}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    suffix={"%"}
                    value={Math.floor(settings.volume * 100)}
                />
            </Setting>

            <Setting locale={`${engineT}interpolation.title`}>
                <select
                    onChange={(e) =>
                        setInterpolation(
                            Number.parseInt(e.target.value) as InterpolationType
                        )
                    }
                    className={"pretty_input monospaced"}
                    value={settings.interpolation}
                >
                    <option value={InterpolationTypes.nearestNeighbor}>
                        {t(`${engineT}interpolation.nearestNeighbor`)}
                    </option>
                    <option value={InterpolationTypes.linear}>
                        {t(`${engineT}interpolation.linear`)}
                    </option>
                    <option value={InterpolationTypes.hermite}>
                        {t(`${engineT}interpolation.cubic`)}
                    </option>
                </select>
            </Setting>

            <Setting locale={`${engineT}voiceCap`}>
                <WaitingInput
                    setValue={setVoiceCap}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    value={settings.voiceCap}
                />
            </Setting>

            <Setting locale={`${engineT}velocitySenseDepth`}>
                <WaitingInput
                    setValue={setVelocitySenseDepth}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    value={settings.velocitySenseDepth}
                />
            </Setting>

            <Setting locale={`${engineT}velocitySenseOffset`}>
                <WaitingInput
                    setValue={setVelocitySenseOffset}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    value={settings.velocitySenseOffset}
                />
            </Setting>

            <Setting locale={`${engineT}reverbLevel`}>
                <WaitingInput
                    setValue={setReverb}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    value={Math.floor(settings.reverbLevel * 100)}
                    suffix={`%`}
                />
            </Setting>

            <Setting locale={`${engineT}chorusLevel`}>
                <WaitingInput
                    setValue={setChorus}
                    value={Math.floor(settings.chorusLevel * 100)}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    suffix={`%`}
                />
            </Setting>

            <Setting locale={`${engineT}delayLevel`}>
                <WaitingInput
                    setValue={setDelay}
                    value={Math.floor(settings.delayLevel * 100)}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    suffix={`%`}
                />
            </Setting>
        </div>
    );
}
