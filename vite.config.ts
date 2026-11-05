/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// The app and spessasynth_core chunks load at startup, and the Worker carries its own core.
// The app is the largest, a bit under 800 kB with the React Compiler's caches
const CHUNK_SIZE_LIMIT_KB = 800;

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 5173,
        strictPort: true,
        host: "127.0.0.1"
    },
    // The React Compiler caches by identity, which works as render reads only the frozen views
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    // The synthesizer Worker splits its chunks too (the Vorbis encoder loads on demand)
    worker: { format: "es" },
    build: {
        target: "esnext",
        chunkSizeWarningLimit: CHUNK_SIZE_LIMIT_KB,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "spessasynth_core",
                            // Also matches a linked ../spessasynth_core (npm run debug)
                            test: /[/\\]spessasynth_core[/\\]/
                        }
                    ]
                }
            }
        }
    },
    test: {
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["src/test_utils/setup.ts"],
        // Restores navigator and other globals that individual tests stub
        unstubGlobals: true,
        // The theme test reads the theme files as text, other CSS stays unprocessed
        css: { include: [/src\/themes\//] },
        // History and core logging is noise unless a test fails
        silent: "passed-only"
    }
});
