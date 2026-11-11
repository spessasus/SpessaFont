// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GeneratorTypes, Modulator, ModulatorSource } from "spessasynth_core";
import { buildModulatorView } from "../../core_backend/entity_views.ts";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { BackStackContext } from "../../phone_shell/back_stack_context.ts";
import { BackStack } from "../../phone_shell/back_stack.ts";
import { TranslatedOptionsContext } from "../../utils/translated_options/translated_options_context.ts";
import { ModulatorCard } from "./modulator_card.tsx";
import { ModulatorSummary } from "./modulator_summary.tsx";

function renderCard(layout: LayoutMode) {
    const mod = buildModulatorView(
        new Modulator(
            new ModulatorSource(),
            new ModulatorSource(),
            GeneratorTypes.initialAttenuation,
            0,
            0
        )
    );
    return render(
        <LayoutContext value={layout}>
            <BackStackContext
                value={{
                    stack: new BackStack(),
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <TranslatedOptionsContext
                    value={{ controllers: [], destinations: [] }}
                >
                    <ModulatorCard
                        mod={mod}
                        modulatorNumber={1}
                        isSelected={false}
                        isOverridingDefault={true}
                        isSFE={true}
                        openCurvePicker={null}
                        onOpenCurvePickerChange={vi.fn()}
                        onChange={vi.fn()}
                        onDelete={vi.fn()}
                        onSelect={vi.fn()}
                    />
                </TranslatedOptionsContext>
            </BackStackContext>
        </LayoutContext>
    );
}

describe("ModulatorCard", () => {
    afterEach(cleanup);

    it("keeps the desktop card", () => {
        const { container } = renderCard("desktop");
        expect(container.querySelector(".modulator_diagram")).not.toBeNull();
        expect(container.querySelector(".modulator_field_label")).toBeNull();
        expect(container.querySelector(".modulator_overrides_note")).toBeNull();
        expect(
            container.querySelector(".modulator_main")?.getAttribute("title")
        ).toBe("modulatorLocale.overriding");
    });

    it("shows labels and the override as text on a phone", () => {
        const { container } = renderCard("phone");
        const labels = [
            ...container.querySelectorAll(".modulator_field_label")
        ].map((l) => l.textContent);
        expect(labels).toEqual([
            "modulatorLocale.primarySource",
            "modulatorLocale.secondarySource",
            "modulatorLocale.amount",
            "modulatorLocale.transform",
            "modulatorLocale.destination"
        ]);
        expect(
            container.querySelector(".modulator_overrides_note")?.textContent
        ).toBe("phoneLocale.modulators.overrides");
        expect(
            screen
                .getByRole("textbox", { name: "modulatorLocale.amount" })
                .getAttribute("inputmode")
        ).toBe("text");
    });

    it("renders one diagram per card on desktop", () => {
        const { container } = renderCard("desktop");
        const diagrams = container.querySelectorAll("svg.modulator_diagram");
        expect(diagrams).toHaveLength(1);
        expect(diagrams[0].getAttribute("aria-hidden")).toBe("true");
    });

    it("renders one diagram in the expanded phone card", () => {
        const { container } = renderCard("phone");
        const diagrams = container.querySelectorAll("svg.modulator_diagram");
        expect(diagrams).toHaveLength(1);
        expect(diagrams[0].getAttribute("aria-hidden")).toBe("true");
    });

    it("renders no diagram in the phone summary row", () => {
        const { container } = render(
            <LayoutContext value={"phone"}>
                <TranslatedOptionsContext
                    value={{ controllers: [], destinations: [] }}
                >
                    <ModulatorSummary
                        mod={buildModulatorView(
                            new Modulator(
                                new ModulatorSource(),
                                new ModulatorSource(),
                                GeneratorTypes.initialAttenuation,
                                0,
                                0
                            )
                        )}
                        modulatorNumber={1}
                        isSelected={false}
                        isExpanded={false}
                        onToggleExpanded={vi.fn()}
                        onSelect={vi.fn()}
                    />
                </TranslatedOptionsContext>
            </LayoutContext>
        );
        expect(container.querySelector(".modulator_diagram")).toBeNull();
    });
});
