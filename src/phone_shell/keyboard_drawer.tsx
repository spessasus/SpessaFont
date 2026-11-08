import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import "./keyboard_drawer.css";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useViewName } from "../hooks/use_view_name.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { Keyboard } from "../keyboard/keyboard/keyboard.tsx";
import { useViewSplits } from "../keyboard/use_view_splits.ts";
import { DrawerHandle, type KeyReadout } from "./drawer_handle.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";

interface KeyboardDrawerProps {
    session: BankSession;
    view: BankEditView;
    /**
     * The settings are drawn over the editor, so its element no longer decides the key ranges.
     */
    isCovered: boolean;
}

/**
 * The piano under the editor (spec 4.6). It is the last child of the shell's column, so it
 * pushes the editor up.
 */
export function KeyboardDrawer({
    session,
    view,
    isCovered
}: KeyboardDrawerProps) {
    const { t } = useTranslation();
    const {
        state: { drawer }
    } = usePhoneShell();
    const splits = useViewSplits(isCovered ? undefined : session, view);
    const name = useViewName(session, view);
    const isSongPlaying = useEngineStatus((s) => s.hasSong && !s.isPaused);
    const [hovered, setHovered] = useState<KeyReadout>({
        midiNote: 60,
        velocity: 100
    });
    // Every pointer on the keys, so a chord keeps its readout until the last finger lifts
    const [downPointers, setDownPointers] = useState<ReadonlySet<number>>(
        new Set()
    );
    // The keys can go while a finger is down, and then no release arrives. A stable ref
    // callback, so its cleanup only runs when the keys leave
    const clearPointersOnUnmount = useCallback(
        () => () => setDownPointers(new Set()),
        []
    );
    const releasePointer = (pointerId: number) =>
        setDownPointers((prev) => {
            if (!prev.has(pointerId)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(pointerId);
            return next;
        });

    return (
        <div className={"keyboard_drawer"}>
            <DrawerHandle
                name={name ?? t("presetList.overview")}
                readout={downPointers.size > 0 ? hovered : undefined}
            />
            {drawer === "keys" && (
                <div className={"drawer_keys"}>
                    {/* The octave strip and zone minimap (Task 18) go in this row */}
                    <div className={"drawer_strip"} />
                    {isSongPlaying ? (
                        <p className={"drawer_song_note"}>
                            {t("phoneLocale.drawer.songOnChannel")}
                        </p>
                    ) : (
                        <div
                            className={"drawer_keyboard"}
                            ref={clearPointersOnUnmount}
                            onPointerDown={(e) => {
                                // Keyboard only takes the primary button of a mouse
                                if (
                                    e.pointerType === "mouse" &&
                                    e.button !== 0
                                ) {
                                    return;
                                }
                                setDownPointers((prev) =>
                                    new Set(prev).add(e.pointerId)
                                );
                            }}
                            onPointerUp={(e) => releasePointer(e.pointerId)}
                            onPointerCancel={(e) => releasePointer(e.pointerId)}
                            onLostPointerCapture={(e) =>
                                releasePointer(e.pointerId)
                            }
                        >
                            <Keyboard
                                splits={splits}
                                onKeyHover={(midiNote, velocity) =>
                                    setHovered((prev) =>
                                        prev.midiNote === midiNote &&
                                        prev.velocity === velocity
                                            ? prev
                                            : { midiNote, velocity }
                                    )
                                }
                            />
                        </div>
                    )}
                </div>
            )}
            {drawer === "controls" && <div className={"drawer_controls"} />}
        </div>
    );
}
