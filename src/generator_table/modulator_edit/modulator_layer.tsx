import type { ReactNode } from "react";
import { usePresence } from "../../hooks/use_presence.ts";

interface ModulatorLayerProps {
    children: ReactNode;
}

/**
 * The phone's modulator layer over the grid. Inside `Presence` it slides away over the grid
 * when closed, while the grid already takes the focus.
 */
export function ModulatorLayer({ children }: ModulatorLayerProps) {
    const { ref, isClosing } = usePresence<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={"modulator_layer"}
            data-state={isClosing ? "closing" : "open"}
            inert={isClosing}
        >
            {children}
        </div>
    );
}
