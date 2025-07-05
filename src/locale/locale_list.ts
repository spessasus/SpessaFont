import { localeEnglish } from "./locale_en/locale.ts";
import { localePolish } from "./locale_pl/locale.ts";

export const LocaleList: Record<string, { translation: object; name: string }> =
    {
        en: { translation: localeEnglish, name: "English" },
        pl: { translation: localePolish, name: "Polski" },
    };
