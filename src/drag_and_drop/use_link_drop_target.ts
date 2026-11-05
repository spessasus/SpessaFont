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
 * Elements removed during the drag (an undo or a delete) are left out, as a zone must not use them.
 */
export function useLinkDropTarget(
    element: BasicInstrument | BasicPreset | undefined
) {
    const { session, apply } = useBankEditor();
    const isChild =
        element instanceof BasicInstrument ? isSample : isInstrument;
    // An element that is gone (a row rendered once more after a delete) takes nothing
    const isOwn = (payload: DragPayload) =>
        element !== undefined &&
        payload.session === session &&
        payload.entities.every((e) => isChild(e));
    return useDropTarget({
        accepts: isOwn,
        onDrop: (payload) => {
            if (!element) {
                return;
            }
            const entities = payload.entities.filter((e) =>
                session.document.contains(e)
            );
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
            );
        }
    });
}
