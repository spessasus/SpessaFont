/**
 * A small typed emitter. `subscribe` is a bound arrow and returns the unsubscribe function, so it
 * can be passed straight to `useSyncExternalStore`.
 */
export class ListenerSet<T> {
    private readonly listeners = new Set<(value: T) => void>();

    public readonly subscribe = (listener: (value: T) => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public emit(value: T) {
        for (const listener of this.listeners) {
            listener(value);
        }
    }
}
