export type DrawerState = "collapsed" | "keys" | "controls";

export interface PhoneShellState {
    isNavigatorOpen: boolean;
    isNavigatorPinned: boolean;
    /**
     * Landscape only: the docked navigator is folded to its strip. `isNavigatorOpen` keeps
     * meaning open in portrait, so a rotation back shows what portrait had.
     */
    isNavigatorCollapsed: boolean;
    drawer: DrawerState;
    /**
     * Element changes made from inside the editor since the last pick in the navigator, per tab
     */
    drillDepth: ReadonlyMap<number, number>;
}

export type PhoneShellAction =
    | { type: "openNavigator" }
    | { type: "closeNavigator" }
    | { type: "togglePinned" }
    | { type: "toggleCollapsed" }
    | { type: "setDrawer"; drawer: DrawerState }
    | { type: "editorChange"; tabId: number }
    | { type: "navigatorPick"; tabId: number }
    | { type: "drillBack"; tabId: number };

/**
 * Whether the navigator shows, and whether it covers the editor, so back and the editor's
 * handlers know what the user can see.
 */
export interface NavigatorPresence {
    isShown: boolean;
    isCoveringEditor: boolean;
}

/**
 * In portrait the open navigator covers the editor. In landscape it is docked beside the
 * editor, so it shows unless collapsed and never covers it.
 */
export function getNavigatorPresence(
    state: PhoneShellState,
    isLandscape: boolean
): NavigatorPresence {
    if (isLandscape) {
        return {
            isShown: !state.isNavigatorCollapsed,
            isCoveringEditor: false
        };
    }
    return {
        isShown: state.isNavigatorOpen,
        isCoveringEditor: state.isNavigatorOpen
    };
}

/**
 * What showing the lists takes, for back and the app bar title: opening them in portrait,
 * expanding the collapsed dock in landscape. Undefined while they show.
 */
export function getOpenNavigatorAction(
    state: PhoneShellState,
    isLandscape: boolean
): PhoneShellAction | undefined {
    if (isLandscape) {
        return state.isNavigatorCollapsed
            ? { type: "toggleCollapsed" }
            : undefined;
    }
    return state.isNavigatorOpen ? undefined : { type: "openNavigator" };
}

export const INITIAL_PHONE_SHELL_STATE = {
    isNavigatorOpen: false,
    isNavigatorPinned: false,
    isNavigatorCollapsed: false,
    drawer: "collapsed",
    drillDepth: new Map<number, number>()
} satisfies PhoneShellState;

export function getDrillDepth(state: PhoneShellState, tabId: number) {
    return state.drillDepth.get(tabId) ?? 0;
}

function withDepth(state: PhoneShellState, tabId: number, depth: number) {
    const drillDepth = new Map(state.drillDepth);
    drillDepth.set(tabId, depth);
    return drillDepth;
}

export function phoneShellReducer(
    state: PhoneShellState,
    action: PhoneShellAction
): PhoneShellState {
    switch (action.type) {
        case "openNavigator": {
            return { ...state, isNavigatorOpen: true };
        }
        case "closeNavigator": {
            return { ...state, isNavigatorOpen: false };
        }
        case "togglePinned": {
            return { ...state, isNavigatorPinned: !state.isNavigatorPinned };
        }
        case "toggleCollapsed": {
            return {
                ...state,
                isNavigatorCollapsed: !state.isNavigatorCollapsed
            };
        }
        case "setDrawer": {
            return { ...state, drawer: action.drawer };
        }
        case "editorChange": {
            return {
                ...state,
                drillDepth: withDepth(
                    state,
                    action.tabId,
                    getDrillDepth(state, action.tabId) + 1
                )
            };
        }
        case "navigatorPick": {
            return {
                ...state,
                isNavigatorOpen: state.isNavigatorPinned,
                drillDepth: withDepth(state, action.tabId, 0)
            };
        }
        case "drillBack": {
            return {
                ...state,
                drillDepth: withDepth(
                    state,
                    action.tabId,
                    Math.max(0, getDrillDepth(state, action.tabId) - 1)
                )
            };
        }
    }
}
