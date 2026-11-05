// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("react-hot-toast", () => ({
    default: Object.assign(() => undefined, { error: toastError })
}));

const FALLBACK_RATE = 48_000;
const REJECTED_RATE = 4000;

vi.mock("../core_backend/audio_engine.ts", () => ({
    AudioEngine: class {
        public hostMode = Promise.resolve("main thread");
        public client = { hostErrors: { subscribe: () => () => undefined } };
        public context: { sampleRate: number; resume: () => Promise<void> };
        public constructor(context: { sampleRate: number }) {
            this.context = {
                sampleRate: context.sampleRate,
                resume: () => Promise.resolve()
            };
        }
        public resumeContext() {
            return Promise.resolve();
        }
    }
}));

import { LocaleList } from "../locale/locale_list.ts";
import { AudioEngineProvider } from "./audio_engine_provider.tsx";
import { SettingsProvider } from "../settings/settings_provider.tsx";
import { useSettings } from "../settings/settings_context.ts";
import {
    DEFAULT_SETTINGS,
    SPESSAFONT_SETTINGS_KEY
} from "../settings/save_load/settings_typedef.ts";
import { loadSettings } from "../settings/save_load/load.ts";

/**
 * A browser that takes the default rate only.
 */
class RejectingContext {
    public readonly sampleRate = FALLBACK_RATE;
    public constructor(options: { sampleRate?: number }) {
        if (options.sampleRate !== undefined) {
            throw new DOMException("not supported", "NotSupportedError");
        }
    }
}

function renderWithRejectedRate() {
    return renderHook(() => useSettings(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <SettingsProvider
                initialSettings={{
                    ...DEFAULT_SETTINGS,
                    sampleRate: REJECTED_RATE
                }}
            >
                <AudioEngineProvider>{children}</AudioEngineProvider>
            </SettingsProvider>
        )
    });
}

describe("AudioEngineProvider", () => {
    beforeAll(async () => {
        await i18next.use(initReactI18next).init({
            resources: LocaleList,
            lng: "en",
            fallbackLng: "en",
            interpolation: { escapeValue: false }
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        toastError.mockClear();
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
    });

    it("runs at the default rate after a rejected one and saves it, so the next start is clean", async () => {
        vi.stubGlobal("AudioContext", RejectingContext);
        const { result } = renderWithRejectedRate();
        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.settings.sampleRate).toBe(FALLBACK_RATE);
        expect(loadSettings().sampleRate).toBe(FALLBACK_RATE);
        expect(toastError.mock.calls.map((call) => String(call[0]))).toEqual(
            expect.arrayContaining([
                expect.stringContaining(`${REJECTED_RATE} Hz`) as string
            ])
        );
    });

    it("does not show the start-up errors again on a language change", async () => {
        vi.stubGlobal("AudioContext", RejectingContext);
        const { result } = renderWithRejectedRate();
        await act(async () => {
            await Promise.resolve();
        });
        const before = toastError.mock.calls.length;
        expect(before).toBeGreaterThan(0);

        await act(async () => {
            result.current.updateSettings({ lang: "pl" });
            await i18next.changeLanguage("pl");
        });

        expect(toastError.mock.calls.length).toBe(before);
        await i18next.changeLanguage("en");
    });
});
