import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useDropTarget } from "./drag_context.ts";
import type { DragPayload } from "./drag_controller.ts";
import { isInstrument, isSample } from "../menu_list/menu_selection.ts";
import {
    createInstrumentLinkActions,
    createSampleLinkActions
} from "../menu_list/link_actions.ts";

/**
 * Samples dropped on an instrument, or instruments dropped on a preset, are added to it as
 * new zones, like the link button and the "Add to" menu items. Only elements of the same bank.
 */
export function useLinkDropTarget(element: BasicInstrument | BasicPreset) {
    const { session, apply } = useBankEditor();
    const isChild =
        element instanceof BasicInstrument ? isSample : isInstrument;
    const isOwn = (payload: DragPayload) =>
        payload.session === session &&
        payload.entities.every((e) => isChild(e));
    return useDropTarget({
        accepts: isOwn,
        onDrop: ({ entities }) =>
            apply(
                element instanceof BasicInstrument
                    ? createSampleLinkActions(
                          element,
                          entities.filter(isSample)
                      )
                    : createInstrumentLinkActions(
                          element,
                          entities.filter(isInstrument)
                      )
            )
    });
}
