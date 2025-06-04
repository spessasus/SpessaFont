import * as React from "react";
import { useTranslation } from "react-i18next";

export function Setting({
    locale,
    children
}: {
    locale: string;
    children?: React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className={"setting"}>
            <label>{t(locale)}</label>
            {children}
        </div>
    );
}
