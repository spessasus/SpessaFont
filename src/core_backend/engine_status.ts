import { ListenerSet } from "./listener_set.ts";

/**
 * What the menu bar shows about the synthesizer and the sequencer.
 * Every field is a primitive, so selectors can return them directly.
 */
export interface EngineStatus {
    voiceCount: number;
    /**
     * Whole seconds, so the time display updates once per second.
     */
    time: number;
    duration: number;
    isPaused: boolean;
    hasSong: boolean;
    songName: string | undefined;
}

const STATUS_KEYS = [
    "voiceCount",
    "time",
    "duration",
    "isPaused",
    "hasSong",
    "songName"
] as const satisfies readonly (keyof EngineStatus)[];

/**
 * The engine has no events for these values, so it pushes them here from the render loop.
 * The snapshot keeps its identity until a value actually changes.
 */
export class EngineStatusStore {
    private status: EngineStatus = {
        voiceCount: 0,
        time: 0,
        duration: 0,
        isPaused: true,
        hasSong: false,
        songName: undefined
    };
    private readonly changes = new ListenerSet<void>();

    public readonly subscribe = (listener: () => void) =>
        this.changes.subscribe(listener);

    public readonly getSnapshot = () => this.status;

    public update(next: EngineStatus) {
        if (STATUS_KEYS.every((key) => next[key] === this.status[key])) {
            return;
        }
        this.status = next;
        this.changes.emit();
    }
}
