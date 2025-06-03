import type { BasicPreset, BasicSoundBank } from "spessasynth_core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./preset_list.css";

export function PresetList({ bank }: { bank: BasicSoundBank | undefined }) {
    const [searchQuery, setSearchQuery] = useState("");
    const { t } = useTranslation();

    if (bank === undefined) {
        return <></>;
    }

    const presetNameMap: { displayName: string; preset: BasicPreset }[] =
        bank.presets.map((p) => {
            return {
                displayName: `${p.bank.toString().padStart(3, "0")}:${p.bank
                    .toString()
                    .padStart(3, "0")} ${p.presetName}`,
                preset: p
            };
        });

    const filteredPresets = presetNameMap.filter((p) =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={"preset_list_main"}>
            <div className={"preset_list"}>
                {filteredPresets.map((p) => (
                    <div
                        key={`${p.preset.bank}-${p.preset.program}`}
                        className="preset_item"
                    >
                        <span className="preset_name">{p.displayName}</span>
                    </div>
                ))}
            </div>
            <div className={"search_bar"}>
                <input
                    className={"pretty_input"}
                    placeholder={t("presetList.search")}
                    type={"text"}
                    value={searchQuery}
                    onInput={(e) =>
                        setSearchQuery((e.target as HTMLInputElement).value)
                    }
                />
            </div>
        </div>
    );
}
