import { useTranslation } from "react-i18next";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { useScopedToastDialog } from "../hooks/use_scoped_toast_dialog.ts";
import { hasSFEOnlyData } from "../core_backend/sfe_data.ts";
import { SetBankFormatAction } from "../core_backend/set_bank_format_action.ts";
import { BANK_FORMATS, type BankFormat } from "../core_backend/bank_format.ts";

const FORMAT_LABEL_KEYS = {
    sf2: "bankInfo.format.sf2",
    sfe: "bankInfo.format.sfe"
} as const satisfies Record<BankFormat, string>;

function isBankFormat(value: string): value is BankFormat {
    return (Object.values(BANK_FORMATS) as string[]).includes(value);
}

/**
 * Picks SF2 or SFE mode. Leaving SFE mode while the bank uses SFE data asks first, the data
 * stays and only goes out of sight.
 */
export function BankFormatField() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const format = useBankSnapshot(session.store, (s) => s.format);
    const showScopedToastDialog = useScopedToastDialog();

    const setFormat = (next: BankFormat) => {
        // Read when the user acts, a toast may answer after an undo
        const current = session.document.format;
        if (current !== next) {
            apply([new SetBankFormatAction(current, next)]);
        }
    };

    const handleChange = (next: BankFormat) => {
        if (next === "sfe" || !hasSFEOnlyData(session.document.bank)) {
            setFormat(next);
            return;
        }
        showScopedToastDialog({
            content: t("bankInfo.format.hideSFEData"),
            buttons: [
                {
                    label: t("bankInfo.format.switchToSF2"),
                    onClick: () => setFormat("sf2")
                },
                { label: t("contextMenu.cancel") }
            ]
        });
    };

    return (
        <span>
            <label htmlFor={"bank_format"}>{t("bankInfo.format.label")}</label>
            <select
                id={"bank_format"}
                className={"pretty_outline bank_format_select"}
                value={format}
                onChange={(e) => {
                    if (isBankFormat(e.target.value)) {
                        handleChange(e.target.value);
                    }
                }}
            >
                {Object.values(BANK_FORMATS).map((value) => (
                    <option key={value} value={value}>
                        {t(FORMAT_LABEL_KEYS[value])}
                    </option>
                ))}
            </select>
        </span>
    );
}
