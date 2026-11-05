import { logWarn } from "../utils/core_utils.ts";
import { SynthHost, type SynthHostOptions } from "./synth_host.ts";

/*
 * The Worker the synthesizer host runs in. It says "loaded" once its modules run, so a host
 * that moves here sends its sample data only to a Worker that works. The first message brings
 * the options (with that data, for a move) and the port to talk on, and the Worker answers
 * "ready" once the host is running.
 */

interface WorkerStart {
    options: SynthHostOptions;
    port: MessagePort;
}

/**
 * The encoder is only needed for SF3 saves, so it loads after a while, which also lets the
 * service worker cache it for offline use.
 */
const ENCODER_PREFETCH_DELAY = 10_000;

async function prefetchEncoder() {
    try {
        const encoder = await import("../core_backend/encode_vorbis.ts");
        await encoder.prefetchVorbisEncoder();
    } catch (error) {
        logWarn("Could not load the Vorbis encoder ahead.", error);
    }
}

/**
 * Kept on the global, as Firefox's cycle collector walks every object that only a listener
 * keeps alive. Held by the port's listener alone, a large bank's millions of generators stopped
 * the Worker for seconds after each garbage collection.
 */
const worker = globalThis as typeof globalThis & { host?: SynthHost };

addEventListener(
    "message",
    (e: MessageEvent<WorkerStart>) => {
        worker.host = new SynthHost(e.data.port, e.data.options);
        postMessage("ready");
        setTimeout(() => void prefetchEncoder(), ENCODER_PREFETCH_DELAY);
    },
    { once: true }
);

postMessage("loaded");
