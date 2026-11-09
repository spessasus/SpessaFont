export type DrawerState = "collapsed" | "keys";

export interface PhoneShellState {
    isNavigatorOpen: boolean;
    isNavigatorPinned: boolean;
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
    | { type: "setDrawer"; drawer: DrawerState }
    | { type: "editorChange"; tabId: number }
    | { type: "navigatorPick"; tabId: number }
    | { type: "drillBack"; tabId: number };

export const INITIAL_PHONE_SHELL_STATE = {
    isNavigatorOpen: false,
    isNavigatorPinned: false,
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
