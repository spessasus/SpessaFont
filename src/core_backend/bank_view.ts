import type {
    BasicInstrument,
    BasicPreset,
    BasicSample
} from "spessasynth_core";

/**
 * A preset, instrument or sample of a sound bank.
 */
export type BankEntity = BasicPreset | BasicInstrument | BasicSample;

/**
 * What the bank editor shows: the bank overview or one element.
 */
export type BankEditView = "info" | BankEntity;
