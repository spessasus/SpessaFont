import type { GeneratorProps } from "../generator_row.tsx";
import {
    BasicInstrumentZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import { useCallback } from "react";
import { SetGeneratorAction } from "./set_generator_action.ts";

export function OffsetGeneratorCell({
    zone,
    linkedZone,
    generatorType,
    callback,
    manager,
    colSpan
}: Omit<GeneratorProps, "generator"> & {
    zone: BasicZone;
    linkedZone?: BasicZone;
    generatorType:
        | generatorTypes.startAddrsOffset
        | generatorTypes.endAddrOffset
        | generatorTypes.startloopAddrsOffset
        | generatorTypes.endloopAddrsOffset;
    colSpan: number;
}) {
    let coarseGeneratorType: generatorTypes;
    switch (generatorType) {
        case generatorTypes.startAddrsOffset:
            coarseGeneratorType = generatorTypes.startAddrsCoarseOffset;
            break;

        case generatorTypes.endAddrOffset:
            coarseGeneratorType = generatorTypes.endAddrsCoarseOffset;
            break;

        case generatorTypes.startloopAddrsOffset:
            coarseGeneratorType = generatorTypes.startloopAddrsCoarseOffset;
            break;
        case generatorTypes.endloopAddrsOffset:
            coarseGeneratorType = generatorTypes.endloopAddrsCoarseOffset;
    }
    const currentFineOffset = zone.getGeneratorValue(generatorType, null);
    const currentCoarseOffset = zone.getGeneratorValue(
        coarseGeneratorType,
        null
    );
    let textValue = "";
    if (currentFineOffset !== null) {
        let offsetNum = currentFineOffset;
        if (currentCoarseOffset !== null) {
            offsetNum += currentCoarseOffset * 32768;
        }
        textValue = offsetNum.toString();
    }

    const setValue = useCallback(
        (typedText: string) => {
            if (typedText === textValue) {
                return textValue;
            }
            let newOffset: number | null = null;
            if (typedText !== "") {
                const num = parseInt(typedText);
                // clamp to a reasonable one
                const sampleLength =
                    zone instanceof BasicInstrumentZone
                        ? zone.sample.getAudioData().length - 1
                        : Infinity;
                newOffset = Math.min(
                    sampleLength,
                    Math.max(-sampleLength, num)
                );
            }
            const actions: SetGeneratorAction[] = [];
            if (newOffset === null) {
                actions.push(
                    new SetGeneratorAction(
                        zone,
                        generatorType,
                        currentFineOffset,
                        null,
                        callback
                    ),
                    new SetGeneratorAction(
                        zone,
                        coarseGeneratorType,
                        currentCoarseOffset,
                        null,
                        callback
                    )
                );
                if (linkedZone) {
                    actions.push(
                        new SetGeneratorAction(
                            linkedZone,
                            generatorType,
                            linkedZone.getGeneratorValue(generatorType, null),
                            null,
                            callback
                        ),
                        new SetGeneratorAction(
                            linkedZone,
                            coarseGeneratorType,
                            linkedZone.getGeneratorValue(
                                coarseGeneratorType,
                                null
                            ),
                            null,
                            callback
                        )
                    );
                }
            } else {
                const fine = newOffset % 32768;
                const coarse = Math.trunc(newOffset / 32768);
                const coarseTarget = coarse || null;
                actions.push(
                    new SetGeneratorAction(
                        zone,
                        generatorType,
                        currentFineOffset,
                        fine,
                        callback
                    )
                );
                actions.push(
                    new SetGeneratorAction(
                        zone,
                        coarseGeneratorType,
                        currentCoarseOffset,
                        coarseTarget,
                        callback
                    )
                );
                if (linkedZone) {
                    actions.push(
                        new SetGeneratorAction(
                            linkedZone,
                            generatorType,
                            linkedZone.getGeneratorValue(generatorType, null),
                            fine,
                            callback
                        )
                    );
                    actions.push(
                        new SetGeneratorAction(
                            linkedZone,
                            coarseGeneratorType,
                            linkedZone.getGeneratorValue(generatorType, null),
                            coarseTarget,
                            callback
                        )
                    );
                }
            }
            manager.modifyBank(actions);
            return newOffset?.toString() || "";
        },
        [
            textValue,
            manager,
            zone,
            generatorType,
            currentFineOffset,
            callback,
            coarseGeneratorType,
            currentCoarseOffset,
            linkedZone
        ]
    );

    return (
        <td className={"generator_cell"} colSpan={colSpan}>
            <GeneratorCellInput
                value={textValue}
                regex={/[^0-9-]/g}
                onBlur={setValue}
                maxLength={10}
                type={"text"}
            />
        </td>
    );
}
