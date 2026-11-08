import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSettings } from "../settings/settings_context.ts";
import { useMediaQuery } from "../hooks/use_media_query.ts";
import { applyLayout } from "./apply_layout.ts";
import { LayoutContext } from "./layout_context.ts";
import { PHONE_LAYOUT_QUERY, resolveLayout } from "./layout_setting.ts";

interface LayoutProviderProps {
    children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
    const { settings } = useSettings();
    const doesMatchPhoneQuery = useMediaQuery(PHONE_LAYOUT_QUERY);
    const mode = resolveLayout(settings.layout, doesMatchPhoneQuery);
    useEffect(() => {
        applyLayout(mode);
    }, [mode]);
    return <LayoutContext value={mode}>{children}</LayoutContext>;
}
