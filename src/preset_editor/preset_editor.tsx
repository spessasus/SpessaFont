import type { BasicPreset } from "spessasynth_core";
import "./preset_editor.css";
import { BottomBar } from "./bottom_bar/bottom_bar.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { useLinkDropTarget } from "../drag_and_drop/use_link_drop_target.ts";
import { PRESET_ROWS } from "./preset_rows.ts";
import { ZoneToolsMenu } from "../generator_table/tools/zone_tools_menu.tsx";
import { useLayout } from "../layout/layout_context.ts";

interface PresetEditorProps {
    preset: BasicPreset;
}

export function PresetEditor({ preset }: PresetEditorProps) {
    // The whole editor takes dropped children, not only the table
    const dropTarget = useLinkDropTarget(preset);
    const layout = useLayout();
    return (
        <div className={"preset_editor"} {...dropTarget}>
            <ZoneToolsMenu element={preset} />
            <GeneratorTable
                key={getObjectId(preset)}
                rows={PRESET_ROWS}
                element={preset}
            />
            {/* Phones show the bar in the properties sheet */}
            {layout === "phone" ? null : <BottomBar preset={preset} />}
        </div>
    );
}
