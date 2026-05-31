import { localeEnglish } from "./locale_en/locale.ts";
import { localeSpanish } from "./locale_es/locale.ts";
import { localeFrench } from "./locale_fr/locale.ts";
import { localePolish } from "./locale_pl/locale.ts";


export const LocaleList: Record<string, { translation: object; name: string }> =
    {
        en: { translation: localeEnglish, name: "English" },
        es: { translation: localeSpanish, name: "Español" },
        fr: { translation: localeFrench, name: "Français" },
        pl: { translation: localePolish, name: "Polski" }
    };
