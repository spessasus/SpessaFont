import {
    BasicSoundBank,
    loadSoundFont,
    type MIDI,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { FancyChorus, getReverbProcessor } from "spessasynth_lib";
import { ClipBoardManager } from "../clipboard_manager.ts";
import type { TFunction } from "i18next";
import type { HistoryAction } from "./history.ts";
import { logInfo } from "../utils/core_utils.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const CHUNK_COUNT = 16; // 16 * 128 = 2048
const MAX_CHUNKS_QUEUED = 10;

type AudioChunk = [Float32Array, Float32Array];
type AudioChunks = AudioChunk[];

export default class Manager {
    context: AudioContext;

    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    analyser: AnalyserNode;
    chorus: FancyChorus;
    reverb: ConvolverNode;

    clipboard = new ClipBoardManager();

    history: HistoryAction[] = [];
    undoHistory: HistoryAction[] = [];

    bank: BasicSoundBank | undefined;
    setBank: (bank: BasicSoundBank | undefined) => void;

    audioChunksQueued: number = 0;

    intervalID = 0;

    private worklet: AudioWorkletNode | undefined;

    constructor(
        context: AudioContext,
        setBank: (bank: BasicSoundBank | undefined) => void
    ) {
        this.context = context;
        this.setBank = setBank;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            effectsEnabled: true,
            initialTime: context.currentTime
        });

        this.analyser = new AnalyserNode(this.context);
        this.analyser.connect(this.context.destination);
        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.chorus = new FancyChorus(this.analyser);
        this.reverb = getReverbProcessor(context).conv;
        this.reverb.connect(this.analyser);
        SpessaSynthLogging(true, true, true, true);
    }

    getBankName(t: TFunction<"translation", undefined>) {
        return this.bank?.soundFontInfo?.["INAM"] || t("bankInfo.unnamed");
    }

    async resumeContext() {
        await this.context.resume();
        clearInterval(this.intervalID);
        console.log("setting up audio loop");
        await this.context.audioWorklet.addModule("./audio_worklet.js");
        this.worklet = new AudioWorkletNode(
            this.context,
            "playback-processor",
            {
                outputChannelCount: [2, 2, 2],
                numberOfOutputs: 3
            }
        );
        this.worklet.connect(this.analyser, 0);
        this.worklet.connect(this.reverb, 1);
        this.worklet.connect(this.chorus.input, 2);
        this.worklet.port.onmessage = (e) => (this.audioChunksQueued = e.data);

        this.intervalID = setInterval(this.audioLoop.bind(this));
    }

    audioLoop() {
        if (this.audioChunksQueued > MAX_CHUNKS_QUEUED) {
            return;
        }

        const dry: AudioChunks = [];
        const rev: AudioChunks = [];
        const chr: AudioChunks = [];

        for (let i = 0; i < CHUNK_COUNT; i++) {
            // clear data
            const d: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];
            const r: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];
            const c: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];

            // render!
            this.sequencer.processTick();
            this.processor.renderAudio(d, r, c);
            // copy out
            dry.push(d);
            chr.push(c);
            rev.push(r);
        }

        // send to worklet
        if (this.worklet) {
            this.worklet.port.postMessage([dry, rev, chr]);
        }
    }

    async createNewFile() {
        const buf = BasicSoundBank.getDummySoundfontFile();
        const bank = loadSoundFont(buf);
        bank.soundFontInfo["INAM"] = "";
        this.updateBank(bank);
    }

    clearCache() {
        this.processor.clearCache();
    }

    close() {
        delete this.bank;
        this.sequencer.pause();
        this.clearCache();
        this.setBank(undefined);
    }

    modifyBank(action: HistoryAction) {
        if (!this.bank) {
            return;
        }
        action.do(this.bank);
        this.history.push(action);
        this.undoHistory.length = 0;
        // update synth engine
        this.clearCache();
    }

    redoBankModification() {
        if (!this.bank || this.undoHistory.length < 1) {
            return;
        }
        const action = this.undoHistory.pop();
        if (!action) {
            return;
        }
        action.do(this.bank);
        logInfo(`Redid. Remaining undo history: ${this.undoHistory.length}`);
        this.history.push(action);
        this.clearCache();
    }

    undoBankModification() {
        if (!this.bank || this.history.length < 1) {
            return;
        }
        const action = this.history.pop();

        if (!action) {
            return;
        }

        action.undo(this.bank);
        logInfo(`Undid. Remaining history: ${this.history.length}`);
        this.undoHistory.push(action);
        // update synth engine
        this.clearCache();
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
        this.sequencer.currentTime -= 0.1;
        this.setBank(this.bank);
    }

    async loadBank(file: File) {
        const buf = await file.arrayBuffer();
        this.updateBank(loadSoundFont(buf));
    }

    playMIDI(mid: MIDI) {
        this.sequencer.loadNewSongList([mid]);
    }

    pauseMIDI() {
        this.sequencer.pause();
    }

    resumeMIDI() {
        this.sequencer.play();
    }
}
