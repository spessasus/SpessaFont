import { localeEnglish } from "./locale_en/locale.ts";
import { localeSpanish } from "./locale_es/locale.ts";
import { localeFrench } from "./locale_fr/locale.ts";
import { localePolish } from "./locale_pl/locale.ts";
import { localeChinese } from "./locale_zh/locale.ts";

export const LocaleList: Record<string, { translation: object; name: string }> =
    {
        en: { translation: localeEnglish, name: "English" },
        es: { translation: localeSpanish, name: "Español" },
        fr: { translation: localeFrench, name: "Français" },
        pl: { translation: localePolish, name: "Polski" },
        zh: { translation: localeChinese, name: "简体中文" }
    };
