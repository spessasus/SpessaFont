import { SynthHost, type SynthHostOptions } from "../synth_host/synth_host.ts";
import {
    getHandoffTransfer,
    type HandoffEvent,
    type HostCommand,
    type HostEvent,
    type HostHandoff,
    type HostPort
} from "../synth_host/protocol.ts";
import { logError, logInfo } from "../utils/core_utils.ts";

/**
 * The thread the host runs on.
 */
export type HostLocation = "worker" | "main thread";

/**
 * Where the host ended up running when it started. "worker failed" runs on the main thread,
 * because the Worker could not start, and the host stays there.
 */
export type HostMode = HostLocation | "worker failed";

interface RunningHost {
    readonly port: HostPort;
    readonly location: HostLocation;
    /**
     * Ends the host's thread or channel, after it handed off.
     */
    readonly stop: () => void;
}

const WORKER_FAILED = "The synthesizer Worker failed.";

/**
 * Resolves once the Worker's host runs. A Worker that cannot load, or whose host throws while
 * starting, fires an error event instead. There is no timeout, as the dev server can take half a
 * minute to serve a busy machine the Worker's modules. The options (and the handed off sample
 * data in `transfer`) go out only once the Worker has loaded, so a Worker that cannot load
 * takes nothing with it.
 */
function startInWorker(
    options: SynthHostOptions,
    transfer: Transferable[],
    onFailure: (message: string) => void
) {
    return new Promise<RunningHost>((resolve, reject) => {
        const worker = new Worker(
            new URL("../synth_host/host_worker.ts", import.meta.url),
            { type: "module", name: "SpessaFont synthesizer" }
        );
        const channel = new MessageChannel();
        worker.onerror = (event) => {
            event.preventDefault();
            worker.terminate();
            reject(new Error(event.message || WORKER_FAILED));
        };
        worker.onmessage = (e: MessageEvent<"loaded" | "ready">) => {
            if (e.data === "loaded") {
                worker.postMessage({ options, port: channel.port2 }, [
                    channel.port2,
                    ...transfer
                ]);
                return;
            }
            // The host catches its own errors, so one that gets here may have stopped it
            worker.onerror = (event) => {
                logError(WORKER_FAILED, event.message);
                onFailure(event.message || WORKER_FAILED);
            };
            resolve({
                port: channel.port1,
                location: "worker",
                stop: () => {
                    worker.onerror = null;
                    worker.terminate();
                    channel.port1.close();
                }
            });
        };
    });
}

function startOnMainThread(options: SynthHostOptions): RunningHost {
    const channel = new MessageChannel();
    new SynthHost(channel.port2, options);
    return {
        port: channel.port1,
        location: "main thread",
        stop: () => channel.port1.close()
    };
}

/**
 * The client's port to the host. It keeps what is sent while the host starts or moves to the
 * other thread, so the client can be used right away and nothing is lost on the way.
 */
class HostConnection implements HostPort {
    private readonly options: SynthHostOptions;
    /**
     * Undefined while the host starts or moves.
     */
    private host: RunningHost | undefined;
    private readonly queued = new Array<[unknown, Transferable[]]>();
    private wanted: HostLocation = "worker";
    /**
     * Set when the Worker failed, so the host stays on this thread.
     */
    private isWorkerFailed = false;
    private receiveHandoff: ((state: HostHandoff) => void) | undefined;
    public onmessage: ((event: MessageEvent) => void) | null = null;
    /**
     * Called after the host moved, as the new one needs its own channel to the playback
     * worklet.
     */
    public onMoved: (() => void) | undefined;

    public constructor(options: SynthHostOptions) {
        this.options = options;
    }

    private connect(host: RunningHost) {
        this.host = host;
        host.port.onmessage = (
            event: MessageEvent<HostEvent | HandoffEvent>
        ) => {
            if (event.data.type === "handOff") {
                this.receiveHandoff?.(event.data.state);
                return;
            }
            this.onmessage?.(event);
        };
        for (const [message, transfer] of this.queued.splice(0)) {
            host.port.postMessage(message, transfer);
        }
        this.moveIfWanted();
    }

    private moveIfWanted() {
        const host = this.host;
        if (!host || this.isWorkerFailed || host.location === this.wanted) {
            return;
        }
        // Everything sent from now on waits for the new host
        this.host = undefined;
        void this.move(host, this.wanted);
    }

    private async move(from: RunningHost, to: HostLocation) {
        const state = await new Promise<HostHandoff>((resolve) => {
            this.receiveHandoff = resolve;
            const command: HostCommand = { type: "handOff" };
            from.port.postMessage(command, []);
        });
        this.receiveHandoff = undefined;
        from.stop();
        const options = { ...this.options, handoff: state };
        let next: RunningHost;
        if (to === "worker") {
            try {
                next = await startInWorker(
                    options,
                    getHandoffTransfer(state),
                    (message) => this.fail(message)
                );
            } catch (error) {
                logError("The synthesizer stays on the main thread.", error);
                this.isWorkerFailed = true;
                next = startOnMainThread(options);
            }
        } else {
            next = startOnMainThread(options);
        }
        logInfo(`The synthesizer moved to the ${next.location}.`);
        this.connect(next);
        this.onMoved?.();
    }

    public postMessage(message: unknown, transfer: Transferable[]) {
        if (this.host) {
            this.host.port.postMessage(message, transfer);
        } else {
            this.queued.push([message, transfer]);
        }
    }

    /**
     * Tells the client that the host may be gone, as the host would send it.
     */
    public fail(message: string) {
        this.onmessage?.(
            new MessageEvent("message", {
                data: { type: "hostFailed", message } satisfies HostEvent
            })
        );
    }

    /**
     * Moves the host to the given thread, unless the Worker failed. What is sent from now on
     * goes to the host there.
     */
    public place(location: HostLocation) {
        this.wanted = location;
        this.moveIfWanted();
    }

    /**
     * Starts the host in a Worker, or on this thread when the Worker fails.
     */
    public async start(): Promise<HostMode> {
        try {
            this.connect(
                await startInWorker(this.options, [], (message) =>
                    this.fail(message)
                )
            );
            logInfo("The synthesizer runs in a Worker.");
            return "worker";
        } catch (error) {
            logError("Starting the synthesizer on the main thread.", error);
            this.isWorkerFailed = true;
            this.connect(startOnMainThread(this.options));
            return "worker failed";
        }
    }
}

/**
 * Starts the synthesizer host in a Worker, or on this thread when the Worker fails. The
 * connection can be used at once, `mode` says where the host started once that is known.
 */
export function startHost(options: SynthHostOptions) {
    const connection = new HostConnection(options);
    return { connection, mode: connection.start() };
}
