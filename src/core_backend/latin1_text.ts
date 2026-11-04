import type { BasicSoundBank } from "spessasynth_core";

const LATIN_1_MAX = 0xff;

function isOutsideLatin1(text: string | undefined) {
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
 * Whether a name or an info text uses characters outside Latin-1 (Polish letters, CJK).
 * spessasynth_core writes every text as one byte per character, so these come back wrong
 * in SF2, SF3, SFE and DLS files. A UTF-8 option in core would remove the need to warn.
 */
export function hasTextOutsideLatin1(bank: BasicSoundBank) {
    const {
        name,
        soundEngine,
        engineer,
        product,
        copyright,
        comment,
        subject,
        romInfo
    } = bank.soundBankInfo;
    const texts = [
        name,
        soundEngine,
        engineer,
        product,
        copyright,
        comment,
        subject,
        romInfo,
        ...bank.presets.map((p) => p.name),
        ...bank.instruments.map((i) => i.name),
        ...bank.samples.map((s) => s.name)
    ];
    return texts.some((text) => isOutsideLatin1(text));
}
