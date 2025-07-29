interface AudioWorkletProcessor {
    readonly port: MessagePort;

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

declare const AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

interface AudioParamDescriptor {
    name: string;
    automationRate: "a-rate" | "k-rate";
    minValue: number;
    maxValue: number;
    defaultValue: number;
}

declare function registerProcessor(
    name: string,
    processorCtor: (new (
        options?: AudioWorkletNodeOptions
    ) => AudioWorkletProcessor) & {
        parameterDescriptors?: AudioParamDescriptor[];
    }
): undefined;
