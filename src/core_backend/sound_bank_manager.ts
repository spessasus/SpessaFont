import {
    type BasicInstrument,
    type BasicPreset,
    type BasicSample,
    BasicSoundBank,
    type ProgressFunction,
    type SoundBankInfoData,
    SoundBankLoader,
    SpessaSynthProcessor,
    type SpessaSynthSequencer
} from "spessasynth_core";
import { type HistoryActionGroup, HistoryManager } from "./history.ts";
import { encodeVorbis } from "./encode_vorbis.ts";
import {
    reorderInstrumentZones,
    ZONE_SORTING_FUNCTION
} from "../utils/reorder_zones.ts";
import { presetSorter } from "../utils/preset_sorter.ts";
import { SOFTWARE_NAME } from "../utils/software_name.ts";

export type BankEditView = "info" | BasicInstrument | BasicSample | BasicPreset;

export type SaveFormat = "auto" | "sf2" | "dls" | "sf3" | "sf4";

const dummy = BasicSoundBank.getSampleSoundBankFile();

export default class SoundBankManager extends BasicSoundBank {
    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    history = new HistoryManager();
    writeType: SaveFormat = "auto";
    saveHandle?: FileSystemFileHandle;

    currentView: BankEditView = "info";

    // unsaved changes
    dirty = false;
    changeCallback?: () => void;

    constructor(
        processor: SpessaSynthProcessor,
        sequencer: SpessaSynthSequencer,
        bank?: BasicSoundBank
    ) {
        super();
        this.processor = processor;
        this.sequencer = sequencer;

        let actualBank: BasicSoundBank;
        if (bank) actualBank = bank;
        else {
            const b = SoundBankLoader.fromArrayBuffer(dummy.slice());
            b.soundBankInfo.software = SOFTWARE_NAME;
            actualBank = b;
        }
        this.writeType = actualBank.type === "sfe" ? "sf4" : actualBank.type;
        Object.assign(this, actualBank);
        if (bank === undefined) {
            this.soundBankInfo.name = "";
        }
        // fix preset references
        // @ts-expect-error hacky way to make this work
        // noinspection JSConstantReassignment
        for (const p of this.presets) p.parentSoundBank = this;
        this.sortElements();
        this.sendBankToSynth();
    }

    flushAndSortPresets() {
        this.flush();
        this.presets.sort(presetSorter);
    }

    sortElements() {
        this.flushAndSortPresets();
        this.samples.sort((a, b) =>
            a.name > b.name ? 1 : b.name > a.name ? -1 : 0
        );
        this.instruments.sort((a, b) =>
            a.name > b.name ? 1 : b.name > a.name ? -1 : 0
        );

        // sort stereo zones
        for (const i of this.instruments) this.sortInstrumentZones(i);

        // sort preset zones
        for (const p of this.presets) p.zones.sort(ZONE_SORTING_FUNCTION);
    }

    sortInstrumentZones(i: BasicInstrument) {
        i.zones = reorderInstrumentZones(i.zones);
    }

    getBankName(unnamed: string) {
        const info = this.getInfo("name");
        return info.length > 0 ? info : unnamed;
    }

    getInfo<K extends keyof SoundBankInfoData>(
        fourCC: K
    ): SoundBankInfoData[K] {
        return this.soundBankInfo?.[fourCC];
    }

    getTabName(unnamed: string) {
        return `${this.dirty ? "* " : ""}${this.getBankName(unnamed)}`;
    }

    clearCache() {
        this.processor.clearCache();
    }

    close() {
        if (
            this.processor.soundBankManager.soundBankList[0].soundBank === this
        ) {
            this.processor.soundBankManager.addSoundBank(
                SoundBankLoader.fromArrayBuffer(dummy.slice()),
                "main"
            );
        }
        this.clearCache();
        this.destroySoundBank();
    }

    async save(format: SaveFormat, progressFunction?: ProgressFunction) {
        let binary: ArrayBuffer;
        const saveAs = format !== "auto";
        switch (format) {
            default:
            case "auto": {
                // Auto means the last write type
                switch (this.writeType) {
                    default:
                    case "auto":
                    case "sf2":
                    case "sf3": {
                        // SF2 write without compress/decompress preserves sf2/sf3
                        binary = this.writeSF2({
                            progressFunction,
                            software: SOFTWARE_NAME
                        });
                        // Prevent writing .auto extension (will change to sf3 if needed)
                        format = "sf2";
                        break;
                    }

                    case "sf4": {
                        binary = this.writeSFE({
                            progressFunction,
                            software: SOFTWARE_NAME
                        });
                        format = "sf4";
                        break;
                    }

                    case "dls": {
                        binary = this.writeDLS({
                            progressFunction,
                            software: SOFTWARE_NAME
                        });
                        format = "dls";
                        break;
                    }
                }

                break;
            }

            case "sf2": {
                // SF2 means explicit decompression
                this.writeType = "sf2";
                await this.setSampleFormat({
                    format: "pcm",
                    progressFunction
                });
                binary = this.writeSF2({
                    progressFunction,
                    software: SOFTWARE_NAME
                });
                break;
            }

            case "sf4": {
                binary = this.writeSFE({
                    progressFunction,
                    software: SOFTWARE_NAME
                });
                format = "sf4";
                break;
            }

            case "dls": {
                this.writeType = "dls";
                binary = this.writeDLS({
                    progressFunction,
                    software: SOFTWARE_NAME
                });
                break;
            }

            case "sf3": {
                this.writeType = "sf3";
                await this.setSampleFormat({
                    format: "compressed",
                    compressionFunction: encodeVorbis,
                    progressFunction
                });
                binary = this.writeSF2({
                    software: SOFTWARE_NAME,
                    progressFunction
                });
            }
        }
        // Ensure SF3
        if (this.samples.some((s) => s.isCompressed)) {
            format = "sf3";
        }
        try {
            await this.saveToDisk(
                binary,
                `${this.getBankName("Unnamed")}.${format}`,
                saveAs
            );
        } catch (error) {
            console.error(error);
            return false;
        }
        this.dirty = false;
        this.changeCallback?.();
        return true;
    }

    /**
     * Performs the actual "saving" of the file (downloading).
     * Uses File System Access API on supported browsers and Desktop Edition.
     * @param binary the binary data
     * @param name the suggested file
     * @param overrideSaveHandle for FSA API only: shows a new file picker window even if we already have a save handle.
     */
    async saveToDisk(
        binary: ArrayBuffer,
        name: string,
        overrideSaveHandle: boolean
    ) {
        // get file handle if we don't have it and the browser supports it
        if (
            (!this.saveHandle || overrideSaveHandle) &&
            "showSaveFilePicker" in globalThis
        ) {
            this.saveHandle = await globalThis.showSaveFilePicker({
                id: "spessafont-save-file",
                suggestedName: name
            });
        }

        if (this.saveHandle) {
            const writable = await this.saveHandle.createWritable();
            await writable.write(binary);
            await writable.close();
            return;
        }

        const buffer = binary;
        let blob: Blob;
        if (buffer.byteLength > 2_147_483_648) {
            const chunks: ArrayBuffer[] = [];
            let toWrite = 0;
            while (toWrite < binary.byteLength) {
                // 50MB chunks (browsers don't like 4GB array buffers)
                const size = Math.min(52_428_800, binary.byteLength - toWrite);
                chunks.push(buffer.slice(toWrite, toWrite + size));
                toWrite += size;
            }

            blob = new Blob(chunks);
        } else {
            blob = new Blob([buffer]);
        }
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = name;
        a.click();

        // clean up the object URL after a short delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.info("Object URL revoked to free memory");
        }, 1000);
    }

    sendBankToSynth() {
        this.processor.soundBankManager.addSoundBank(this, "main");
        this.processor.clearCache();
        this.sequencer.currentTime -= 0.1;
    }

    modifyBank(actions: HistoryActionGroup) {
        if (actions.length === 0) {
            return;
        }
        this.history.do(this, actions);
        this.dirty = true;
        this.changeCallback?.();
    }

    undo() {
        this.history.undo(this);
        if (this.history.length === 0) {
            this.dirty = false;
        }
        this.changeCallback?.();
    }

    redo() {
        this.history.redo(this);
        this.dirty = true;
        this.changeCallback?.();
    }
}
