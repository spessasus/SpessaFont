declare module "spessasynth_core" {
    export class IndexedByteArray extends Uint8Array {
        currentIndex: number;
    }

    export const SpessaSynthCoreUtils: {
        consoleColors: {
            warn: string;
            unrecognized: string;
            info: string;
            recognized: string;
            value: string;
        };
        SpessaSynthInfo: (...args: unknown[]) => void;
        SpessaSynthWarn: (...args: unknown[]) => void;
        SpessaSynthGroupCollapsed: (...args: unknown[]) => void;
        SpessaSynthGroupEnd: () => void;
        readBytesAsUintBigEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readLittleEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readBytesAsString: (
            data: IndexedByteArray,
            bytes: number,
            encoding: ?string,
            trimEnd: boolean = false
        ) => string;
        readVariableLengthQuantity: (MIDIByteArray: IndexedByteArray) => number;
        inflateSync: (data: Uint8Array) => Uint8Array;
    };
}
