export const BACK_LEVELS = {
    leave: 0,
    openNavigator: 1,
    drillDown: 2,
    overviewPanel: 3,
    modulatorLayer: 4,
    closeNavigator: 5,
    selection: 6,
    settings: 7,
    transient: 8
} as const;
export type BackLevel = (typeof BACK_LEVELS)[keyof typeof BACK_LEVELS];

/**
 * Returns true when it handled the back press, false to pass it on
 */
export type BackHandler = (stack: BackStack) => boolean;

interface BackEntry {
    level: BackLevel;
    handler: BackHandler;
    order: number;
}

/**
 * The phone's back press handlers. Higher levels run first, and within a level the newest
 * handler runs first, until one handles the press.
 */
export class BackStack {
    private readonly entries = new Set<BackEntry>();
    private nextOrder = 0;

    /**
     * Adds a handler and returns the function that removes it.
     */
    public register(level: BackLevel, doesHandleBack: BackHandler) {
        const entry: BackEntry = {
            level,
            handler: doesHandleBack,
            order: this.nextOrder
        };
        this.nextOrder += 1;
        this.entries.add(entry);
        return () => {
            this.entries.delete(entry);
        };
    }

    public hasActive(levels: readonly BackLevel[]) {
        for (const entry of this.entries) {
            if (levels.includes(entry.level)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Runs the handlers in order and returns whether one of them handled the press.
     */
    public handleBack() {
        // A copy, as a handler may unregister itself or others while this runs
        const ordered = [...this.entries].toSorted(
            (a, b) => b.level - a.level || b.order - a.order
        );
        for (const entry of ordered) {
            if (entry.handler(this)) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Whether closing the navigator would leave something for back to do behind it
 * (spec 5.3, the closeNavigator level).
 */
export function hasBackBehindNavigator(stack: BackStack) {
    return stack.hasActive([
        BACK_LEVELS.drillDown,
        BACK_LEVELS.overviewPanel,
        BACK_LEVELS.modulatorLayer
    ]);
}
