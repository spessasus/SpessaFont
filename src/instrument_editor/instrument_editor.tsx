import type { BasicInstrument } from "spessasynth_core";
import "./instrument_editor.css";
import { LinkedPresets } from "./linked_presets/linked_presets.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { INSTRUMENT_ROWS } from "./instrument_rows.ts";

interface InstrumentEditorProps {
    instrument: BasicInstrument;
}

export function InstrumentEditor({ instrument }: InstrumentEditorProps) {
    return (
        <div className={"instrument_editor"}>
            <GeneratorTable
                key={getObjectId(instrument)}
                rows={INSTRUMENT_ROWS}
                element={instrument}
            />
            <LinkedPresets instrument={instrument} />
        </div>
    );
}
