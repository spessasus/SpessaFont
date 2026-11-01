import type { BasicPreset } from "spessasynth_core";
import "./preset_editor.css";
import { BottomPresetBar } from "./bottom_bar/bottom_bar.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { PRESET_ROWS } from "./preset_rows.ts";

interface PresetEditorProps {
    preset: BasicPreset;
}

export function PresetEditor({ preset }: PresetEditorProps) {
    return (
        <div className={"preset_editor"}>
            <GeneratorTable
                key={getObjectId(preset)}
                rows={PRESET_ROWS}
                element={preset}
            />
            <BottomPresetBar preset={preset} />
        </div>
    );
}
