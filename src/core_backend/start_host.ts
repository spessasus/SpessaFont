import { SynthHost, type SynthHostOptions } from "../synth_host/synth_host.ts";
import type { HostPort } from "../synth_host/protocol.ts";
import { logError, logInfo } from "../utils/core_utils.ts";

/**
 * Where the host ended up running.
 */
export type HostMode = "worker" | "main thread";

/**
 * A port that keeps what is sent until the host's real port is known, so the client can be used
 * right away while the Worker starts, and nothing is lost if the host falls back to this thread.
 */
class DeferredPort implements HostPort {
    private target: HostPort | undefined;
    private readonly queued = new Array<[unknown, Transferable[]]>();
    public onmessage: ((event: MessageEvent) => void) | null = null;

    public postMessage(message: unknown, transfer: Transferable[]) {
        if (this.target) {
            this.target.postMessage(message, transfer);
        } else {
            this.queued.push([message, transfer]);
        }
    }

    public connect(target: HostPort) {
        this.target = target;
        target.onmessage = (event) => this.onmessage?.(event);
        for (const [message, transfer] of this.queued.splice(0)) {
            target.postMessage(message, transfer);
        }
    }
}

/**
 * Resolves once the Worker's host runs. A Worker that cannot load, or whose host throws while
 * starting, fires an error event instead. There is no timeout, as the dev server can take half a
 * minute to serve a busy machine the Worker's modules.
 */
function startInWorker(options: SynthHostOptions) {
    return new Promise<MessagePort>((resolve, reject) => {
        const worker = new Worker(
            new URL("../synth_host/host_worker.ts", import.meta.url),
            { type: "module", name: "SpessaFont synthesizer" }
        );
        const channel = new MessageChannel();
        worker.onerror = (event) => {
            event.preventDefault();
            worker.terminate();
            reject(
                new Error(event.message || "The synthesizer Worker failed.")
            );
        };
        worker.onmessage = () => {
            worker.onerror = (event) => {
                logError("The synthesizer Worker failed.", event.message);
            };
            resolve(channel.port1);
        };
        worker.postMessage({ options, port: channel.port2 }, [channel.port2]);
    });
}

function startOnMainThread(options: SynthHostOptions) {
    const channel = new MessageChannel();
    new SynthHost(channel.port2, options);
    return channel.port1;
}

/**
 * Starts the synthesizer host in a Worker, or on this thread when the Worker fails. The port
 * can be used at once, `mode` says where the host runs once that is known.
 */
export function startHost(options: SynthHostOptions) {
    const port = new DeferredPort();
    const start = async (): Promise<HostMode> => {
        try {
            port.connect(await startInWorker(options));
            logInfo("The synthesizer runs in a Worker.");
            return "worker";
        } catch (error) {
            logError("Starting the synthesizer on the main thread.", error);
            port.connect(startOnMainThread(options));
            return "main thread";
        }
    };
    return { port, mode: start() };
}
