import type { localeEnglish } from "../locale/locale_en/locale.ts";

declare module "i18next" {
    /**
     * Types the keys of `t()` from the English locale, so an unknown key fails the type check.
     */
    interface CustomTypeOptions {
        defaultNS: "translation";
        resources: { translation: typeof localeEnglish };
    }
}
