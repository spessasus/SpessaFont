import { useTranslation } from "react-i18next";
import type { BankStore } from "../core_backend/bank_store.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * The bank's name, or the placeholder for a bank that has none.
 */
export function useBankDisplayName(store: BankStore) {
    const { t } = useTranslation();
    const name = useBankSnapshot(store, (s) => s.info.name);
    return name || t("bankInfo.unnamed");
}
