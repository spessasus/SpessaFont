/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app and spessasynth_core chunks load at startup and are each a bit under 600 kB
const CHUNK_SIZE_LIMIT_KB = 600;

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 5173,
        strictPort: true,
        host: "127.0.0.1"
    },
    // No React Compiler: it caches by object identity, and the bank objects are edited in place
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    build: {
        target: "esnext",
        chunkSizeWarningLimit: CHUNK_SIZE_LIMIT_KB,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "spessasynth_core",
                            test: /node_modules[/\\]spessasynth_core/
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
        // History and core logging is noise unless a test fails
        silent: "passed-only"
    }
});
