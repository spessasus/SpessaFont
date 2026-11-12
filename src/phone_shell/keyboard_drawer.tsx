import {
    type ReactNode,
    useCallback,
    useEffect,
    useEffectEvent,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import "./keyboard_drawer.css";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useViewName } from "../hooks/use_view_name.ts";
import { useEngineStatus } from "../hooks/use_engine_status.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { Keyboard } from "../keyboard/keyboard/keyboard.tsx";
import { useViewSplits } from "../keyboard/use_view_splits.ts";
import {
    getMinimapSegments,
    getScrollForKey,
    getSplitsCenter,
    getViewColumnIndexes
} from "./zone_minimap_math.ts";
import { DrawerHandle, type KeyReadout } from "./drawer_handle.tsx";
import { OctaveStrip } from "./octave_strip.tsx";
import { usePhoneShell } from "./phone_shell_context.ts";
import { ControlsPanel } from "./controls_panel.tsx";
import type { DrawerState } from "./phone_shell_state.ts";
import { getDrawerOffset } from "./drawer_offset.ts";
import { Presence } from "../presence/presence.tsx";
import { usePresence } from "../hooks/use_presence.ts";

/**
 * Orders the drawer states by height, the controls are the tallest in both orientations.
 */
const DRAWER_RANK: Record<DrawerState, number> = {
    collapsed: 0,
    keys: 1,
    controls: 2
};

interface DrawerShift {
    /**
     * The new height minus the old, taken when the state changed, so a rotation during the
     * slide does not move its start.
     */
    distance: string;
    isGrowing: boolean;
    /**
     * Counts the changes, so each one restarts the slide.
     */
    count: number;
}

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
        state: { drawer },
        isLandscape
    } = usePhoneShell();
    const splits = useViewSplits(isCovered ? undefined : session, view);
    const views = useBankSnapshot(session.store, (s) => s.views);
    const segments = splits
        ? getMinimapSegments(splits, getViewColumnIndexes(view, views))
        : [];
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
    // The keys leave and come back, so the strip gets the element through state
    const [keyboard, setKeyboard] = useState<HTMLDivElement | null>(null);
    const centerKeyboard = useEffectEvent((element: HTMLDivElement) => {
        // Scrolling a scroller is the legitimate DOM exception
        element.scrollTo({
            left: getScrollForKey(
                getSplitsCenter(splits) ?? 60,
                element.clientWidth,
                element.scrollWidth
            )
        });
    });
    // Also on the keys' first show, which would open at C-1 otherwise
    useEffect(() => {
        if (keyboard) {
            centerKeyboard(keyboard);
        }
    }, [keyboard, view]);
    const releasePointer = (pointerId: number) =>
        setDownPointers((prev) => {
            if (!prev.has(pointerId)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(pointerId);
            return next;
        });

    const octaveStrip = <OctaveStrip keyboard={keyboard} segments={segments} />;

    // The drawer's height snaps, so the editor lays out once. The drawer then slides from
    // where it was to where it is now, and a pane that left goes down with it
    const [lastDrawer, setLastDrawer] = useState(drawer);
    const [shift, setShift] = useState<DrawerShift | null>(null);
    if (drawer !== lastDrawer) {
        setLastDrawer(drawer);
        setShift({
            distance: `calc(${getDrawerOffset(drawer, isLandscape)} - ${getDrawerOffset(lastDrawer, isLandscape)})`,
            isGrowing: DRAWER_RANK[drawer] > DRAWER_RANK[lastDrawer],
            count: (shift?.count ?? 0) + 1
        });
    }

    return (
        <div
            className={"keyboard_drawer"}
            // The landscape settings cover the drawer too (spec 12.4)
            inert={isCovered && isLandscape}
            data-shift={
                shift === null ? undefined : shift.count % 2 ? "odd" : "even"
            }
            data-shift-direction={
                shift === null ? undefined : shift.isGrowing ? "grow" : "shrink"
            }
            style={
                shift === null
                    ? undefined
                    : { "--drawer-shift": shift.distance }
            }
        >
            <DrawerHandle
                name={name ?? t("presetList.overview")}
                readout={downPointers.size > 0 ? hovered : undefined}
                strip={
                    isLandscape && drawer === "keys" ? octaveStrip : undefined
                }
            />
            <Presence>
                {drawer === "keys" ? (
                    <DrawerPane>
                        <div className={"drawer_keys"}>
                            {/* Landscape moves only the strip, the keyboard keeps its place and scroll */}
                            {isLandscape ? null : (
                                <div className={"drawer_strip"}>
                                    {octaveStrip}
                                </div>
                            )}
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
                                    onPointerUp={(e) =>
                                        releasePointer(e.pointerId)
                                    }
                                    onPointerCancel={(e) =>
                                        releasePointer(e.pointerId)
                                    }
                                    onLostPointerCapture={(e) =>
                                        releasePointer(e.pointerId)
                                    }
                                >
                                    <Keyboard
                                        ref={setKeyboard}
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
                    </DrawerPane>
                ) : null}
            </Presence>
            <Presence>
                {drawer === "controls" ? (
                    <DrawerPane>
                        <ControlsPanel />
                    </DrawerPane>
                ) : null}
            </Presence>
        </div>
    );
}

/**
 * The keys or the controls under the handle. One that leaves stays under the handle while
 * the drawer slides down.
 */
function DrawerPane({ children }: { children: ReactNode }) {
    const { ref, isClosing } = usePresence<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={"drawer_pane"}
            data-state={isClosing ? "closing" : "open"}
            inert={isClosing}
        >
            {children}
        </div>
    );
}
