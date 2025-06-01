import { type BasicSoundBank, loadSoundFont } from "spessasynth_core";

export default class Manager {
    context: AudioContext;

    bank: BasicSoundBank | undefined;

    constructor(context: AudioContext) {
        this.context = context;
    }

    async loadBank(file: File) {
        const buf = await file.arrayBuffer();
        this.bank = loadSoundFont(buf);
    }
}
