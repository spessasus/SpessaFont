/**
 * Locale keys for the unit shown next to each generator name.
 * The keys are spelled out so they stay greppable and type-checked.
 */
export const GENERATOR_UNITS = {
    cent: {
        suffix: "soundBankLocale.units.cent.suf",
        full: "soundBankLocale.units.cent.full"
    },
    acent: {
        suffix: "soundBankLocale.units.acent.suf",
        full: "soundBankLocale.units.acent.full"
    },
    tcent: {
        suffix: "soundBankLocale.units.tcent.suf",
        full: "soundBankLocale.units.tcent.full"
    },
    centPerKey: {
        suffix: "soundBankLocale.units.centPerKey.suf",
        full: "soundBankLocale.units.centPerKey.full"
    },
    tcentPerKey: {
        suffix: "soundBankLocale.units.tcentPerKey.suf",
        full: "soundBankLocale.units.tcentPerKey.full"
    },
    sec: {
        suffix: "soundBankLocale.units.sec.suf",
        full: "soundBankLocale.units.sec.full"
    },
    dB: {
        suffix: "soundBankLocale.units.dB.suf",
        full: "soundBankLocale.units.dB.full"
    },
    Hz: {
        suffix: "soundBankLocale.units.Hz.suf",
        full: "soundBankLocale.units.Hz.full"
    },
    percent: {
        suffix: "soundBankLocale.units.percent.suf",
        full: "soundBankLocale.units.percent.full"
    },
    pan: {
        suffix: "soundBankLocale.units.pan.suf",
        full: "soundBankLocale.units.pan.full"
    },
    presetPan: {
        suffix: "soundBankLocale.units.presetPan.suf",
        full: "soundBankLocale.units.presetPan.full"
    },
    degree: {
        suffix: "soundBankLocale.units.degree.suf",
        full: "soundBankLocale.units.degree.full"
    }
} as const;

export type GeneratorUnit = keyof typeof GENERATOR_UNITS;
