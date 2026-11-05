/*
 * The playback worklet: it plays the chunks the synthesizer host renders, from a queue. The
 * host's end of a channel arrives as a message. The worklet reports how many chunks it
 * has played after every block, which is what makes the host render, and counts the blocks it
 * had nothing to play for (underruns).
 */

/**
 * What the worklet tells the host after each block.
 */
export interface PlaybackReport {
    /**
     * Chunks played since the host connected. A count, unlike the queue length, stays right
     * when reports wait while the host is busy.
     */
    played: number;
    underruns: number;
}

class PlaybackProcessor extends AudioWorkletProcessor {
    private readonly queue = new Array<Float32Array>();
    private host: MessagePort | undefined;
    private underruns = 0;
    private played = 0;
    private hasPlayed = false;

    public constructor() {
        super();
        // A new port comes when the host moves to the other thread. What is queued still plays,
        // and the count starts again, as the new host counts what it sent from zero
        this.port.onmessage = (e: MessageEvent<MessagePort>) => {
            const host = e.data;
            this.host?.close();
            host.onmessage = (message: MessageEvent<Float32Array[]>) => {
                this.queue.push(...message.data);
            };
            this.host = host;
            this.played = 0;
            // Asks for the first chunks
            this.report();
        };
    }

    private report() {
        const report: PlaybackReport = {
            played: this.played,
            underruns: this.underruns
        };
        this.host?.postMessage(report);
    }

    public process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
        const [left, right] = outputs[0];
        const chunk = this.queue.shift();
        if (chunk) {
            this.played++;
            this.hasPlayed = true;
            left.set(chunk.subarray(0, left.length));
            right.set(chunk.subarray(left.length, left.length * 2));
        } else if (this.hasPlayed) {
            // Before the first chunk the host is still starting, which is not a dropout
            this.underruns++;
        }
        this.report();
        return true;
    }
}

registerProcessor("playback-processor", PlaybackProcessor);
