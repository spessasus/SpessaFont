import { useId } from "react";

/**
 * The sources multiplied into the destination. Each card draws one, so the mask id has to be
 * unique on the page.
 */
export function ModulatorDiagram() {
    const maskId = useId();
    return (
        <svg
            className="modulator_diagram"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            aria-hidden={true}
        >
            <rect x="5" y="10" width="45" height="6" />
            <rect x="47" y="10" width="6" height="30" />
            <rect x="5" y="84" width="45" height="6" />
            <rect x="47" y="60" width="6" height="30" />
            <rect x="60" y="47" width="45" height="6" />

            <defs>
                <mask id={maskId}>
                    <rect width="100%" height="100%" fill="white" />
                    <line
                        x1="44"
                        y1="44"
                        x2="56"
                        y2="56"
                        stroke="black"
                        strokeWidth="4"
                    />
                    <line
                        x1="56"
                        y1="44"
                        x2="44"
                        y2="56"
                        stroke="black"
                        strokeWidth="4"
                    />
                </mask>
            </defs>

            <circle cx="50" cy="50" r="12" mask={`url(#${maskId})`} />
        </svg>
    );
}
