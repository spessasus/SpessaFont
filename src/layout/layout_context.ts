import { createContext, useContext } from "react";
import type { LayoutMode } from "./layout_setting.ts";

export const LayoutContext = createContext<LayoutMode | null>(null);

export function useLayout() {
    const layout = useContext(LayoutContext);
    if (layout === null) {
        throw new Error("Used without LayoutProvider!");
    }
    return layout;
}
