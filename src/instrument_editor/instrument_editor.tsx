import type { BasicInstrument } from "spessasynth_core";
import "./instrument_editor.css";
import { LinkedPresets } from "./linked_presets/linked_presets.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { useLinkDropTarget } from "../drag_and_drop/use_link_drop_target.ts";
import { INSTRUMENT_ROWS } from "./instrument_rows.ts";
import { ZoneToolsMenu } from "../generator_table/tools/zone_tools_menu.tsx";
import { useLayout } from "../layout/layout_context.ts";

interface InstrumentEditorProps {
    instrument: BasicInstrument;
}

export function InstrumentEditor({ instrument }: InstrumentEditorProps) {
    // The whole editor takes dropped children, not only the table
    const dropTarget = useLinkDropTarget(instrument);
    const layout = useLayout();
    return (
        <div className={"instrument_editor"} {...dropTarget}>
            <ZoneToolsMenu element={instrument} />
            <GeneratorTable
                key={getObjectId(instrument)}
                rows={INSTRUMENT_ROWS}
                element={instrument}
            />
            {/* Phones show the bar in the properties sheet */}
            {layout === "phone" ? null : (
                <LinkedPresets instrument={instrument} />
            )}
        </div>
    );
}
