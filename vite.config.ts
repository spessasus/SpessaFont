/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 5173,
        strictPort: true,
        host: "127.0.0.1"
    },
    plugins: [react()],
    resolve: {
        alias: {
            "sl-web-ogg": path.resolve(
                import.meta.dirname,
                "externals/sl-web-ogg/dist/index.min.js"
            )
        }
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    build: {
        target: "esnext"
    },
    test: {
        include: ["src/**/*.test.ts"],
        setupFiles: ["src/test_utils/setup.ts"],
        // Restores navigator and other globals that individual tests stub
        unstubGlobals: true,
        // History and core logging is noise unless a test fails
        silent: "passed-only"
    }
});
