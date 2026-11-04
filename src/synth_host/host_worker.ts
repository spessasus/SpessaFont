import { logWarn } from "../utils/core_utils.ts";
import { SynthHost, type SynthHostOptions } from "./synth_host.ts";

/*
 * The Worker the synthesizer host runs in. The first message brings its options and the port to
 * talk on, and the Worker answers "ready" once the host is running, so the engine knows to use
 * it instead of starting the host on the main thread.
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

addEventListener(
    "message",
    (e: MessageEvent<WorkerStart>) => {
        new SynthHost(e.data.port, e.data.options);
        postMessage("ready");
        setTimeout(() => void prefetchEncoder(), ENCODER_PREFETCH_DELAY);
    },
    { once: true }
);
