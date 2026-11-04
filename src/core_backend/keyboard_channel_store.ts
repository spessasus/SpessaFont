import { ListenerSet } from "./listener_set.ts";

/**
 * What the controller panel shows about the keyboard's channel.
 */
export interface KeyboardChannelValues {
    /**
     * Indexed by controller number, 14-bit as the synthesizer stores them.
     */
    readonly controllers: readonly number[];
    readonly pitchWheel: number;
    readonly pressure: number;
}

/**
 * The keyboard channel's values, copied out of the synthesizer by the engine after its events.
 * The snapshot keeps its identity until a value actually changes.
 */
export class KeyboardChannelStore {
    private values: KeyboardChannelValues = {
        controllers: [],
        pitchWheel: 8192,
        pressure: 0
    };
    private readonly changes = new ListenerSet<void>();

    public readonly subscribe = (listener: () => void) =>
        this.changes.subscribe(listener);

    public readonly getSnapshot = () => this.values;

    public update(next: KeyboardChannelValues) {
        const { controllers } = this.values;
        const isSame =
            next.pitchWheel === this.values.pitchWheel &&
            next.pressure === this.values.pressure &&
            next.controllers.length === controllers.length &&
            next.controllers.every((v, i) => v === controllers[i]);
        if (isSame) {
            return;
        }
        this.values = next;
        this.changes.emit();
    }
}
