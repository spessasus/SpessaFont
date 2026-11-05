import type { BasicSoundBank, SoundBankInfoData } from "spessasynth_core";

const LATIN_1_MAX = 0xff;

export function isOutsideLatin1(text: string | undefined) {
    if (text === undefined) {
        return false;
    }
    for (const char of text) {
        const code = char.codePointAt(0);
        if (code !== undefined && code > LATIN_1_MAX) {
            return true;
        }
    }
    return false;
}

/**
 * Whether one of the bank info texts uses characters outside Latin-1.
 */
export function hasInfoTextOutsideLatin1(info: Readonly<SoundBankInfoData>) {
    const {
        name,
        soundEngine,
        engineer,
        product,
        copyright,
        comment,
        subject,
        romInfo
    } = info;
    return [
        name,
        soundEngine,
        engineer,
        product,
        copyright,
        comment,
        subject,
        romInfo
    ].some((text) => isOutsideLatin1(text));
}

/**
 * Whether a name or an info text uses characters outside Latin-1 (Polish letters, CJK).
 * spessasynth_core writes every text as one byte per character, so these come back wrong
 * in SF2, SF3, SFE and DLS files. A UTF-8 option in core would remove the need to warn.
 */
export function hasTextOutsideLatin1(bank: BasicSoundBank) {
    const names = [
        ...bank.presets.map((p) => p.name),
        ...bank.instruments.map((i) => i.name),
        ...bank.samples.map((s) => s.name)
    ];
    return (
        hasInfoTextOutsideLatin1(bank.soundBankInfo) ||
        names.some((text) => isOutsideLatin1(text))
    );
}
