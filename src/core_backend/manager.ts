import {
    BasicSoundBank,
    loadSoundFont,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { FancyChorus, getReverbProcessor } from "spessasynth_lib";

export default class Manager {
    context: AudioContext;

    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    chorus: FancyChorus;
    reverb: ConvolverNode;

    bank: BasicSoundBank | undefined;
    setBank: (bank: BasicSoundBank | undefined) => void;

    dry: AudioBuffer;
    rev: AudioBuffer;
    chr: AudioBuffer;

    bufferSize = 4096;
    blockSize = 128;
    intervalID = 0;
    // dry block
    dBlock = [
        new Float32Array(this.blockSize),
        new Float32Array(this.blockSize)
    ];
    // reverb block
    rBlock = [
        new Float32Array(this.blockSize),
        new Float32Array(this.blockSize)
    ];
    // chorus block
    cBlock = [
        new Float32Array(this.blockSize),
        new Float32Array(this.blockSize)
    ];
    private bufferTime: number;

    constructor(
        context: AudioContext,
        setBank: (bank: BasicSoundBank | undefined) => void
    ) {
        this.context = context;
        this.setBank = setBank;
        this.bufferTime = (this.bufferSize / this.context.sampleRate) * 10;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            effectsEnabled: true,
            initialTime: context.currentTime
        });
        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.chorus = new FancyChorus(context.destination);
        this.reverb = getReverbProcessor(context).conv;
        this.reverb.connect(context.destination);

        const opt = {
            sampleRate: this.context.sampleRate,
            numberOfChannels: 2,
            length: this.bufferSize
        };
        this.dry = new AudioBuffer(opt);
        this.rev = new AudioBuffer(opt);
        this.chr = new AudioBuffer(opt);
        SpessaSynthLogging(true, true, true, true);
    }

    setBufferSize(size: number) {
        if (size % this.blockSize !== 0) {
            throw new Error(`Buffer size must be a multiple of ${size}`);
        }
        this.bufferSize = size;
        this.bufferTime = (this.bufferSize / this.context.sampleRate) * 10;
    }

    async resumeContext() {
        await this.context.resume();
        clearInterval(this.intervalID);
        console.log("setting up audio loop");
        this.intervalID = setInterval(this.audioLoop.bind(this));
    }

    audioLoop() {
        if (
            this.processor.currentSynthTime >
            this.context.currentTime + this.bufferTime
        ) {
            return;
        }

        let filled = 0;
        const synTime = this.processor.currentSynthTime;

        while (filled < this.bufferSize) {
            // clear data
            this.dBlock.forEach((v) => v.fill(0));
            this.rBlock.forEach((v) => v.fill(0));
            this.cBlock.forEach((v) => v.fill(0));

            // render!
            this.sequencer.processTick();
            this.processor.renderAudio(this.dBlock, this.rBlock, this.cBlock);
            // copy out
            this.dry.copyToChannel(this.dBlock[0], 0, filled);
            this.dry.copyToChannel(this.dBlock[1], 1, filled);
            this.rev.copyToChannel(this.rBlock[0], 0, filled);
            this.rev.copyToChannel(this.rBlock[1], 1, filled);
            this.chr.copyToChannel(this.cBlock[0], 0, filled);
            this.chr.copyToChannel(this.cBlock[1], 1, filled);
            filled += this.blockSize;
        }

        const oscDry = new AudioBufferSourceNode(this.context, {
            buffer: this.dry
        });
        oscDry.connect(this.context.destination);

        const oscChr = new AudioBufferSourceNode(this.context, {
            buffer: this.chr
        });
        oscChr.connect(this.chorus.input);

        const oscRev = new AudioBufferSourceNode(this.context, {
            buffer: this.rev
        });
        oscRev.connect(this.reverb);

        oscDry.start(synTime);
        oscChr.start(synTime);
        oscRev.start(synTime);
    }

    async createNewFile() {
        const buf = BasicSoundBank.getDummySoundfontFile();
        const bank = loadSoundFont(buf);
        bank.soundFontInfo["INAM"] = "";
        this.updateBank(bank);
    }

    close() {
        delete this.bank;
        this.setBank(undefined);
    }

    save(format: "sf2" | "dls") {
        if (this.bank === undefined) {
            return;
        }
        let binary: Uint8Array;
        switch (format) {
            case "sf2":
                binary = this.bank.write();
                break;

            case "dls":
                binary = this.bank.writeDLS();
                break;
        }
        const blob = new Blob([binary.buffer]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.bank.soundFontInfo["INAM"] || "unnamed"}.${format}`;
        console.log(a);
        a.click();
    }

    updateBank(bank: BasicSoundBank) {
        this.bank = bank;
        this.processor.soundfontManager.reloadManager(this.bank);
        this.setBank(this.bank);
    }

    async loadBank(file: File) {
        const buf = await file.arrayBuffer();
        this.updateBank(loadSoundFont(buf));
    }
}
