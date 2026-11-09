/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { writeFileSync } from "node:fs";
import path from "node:path";

// The app and spessasynth_core chunks load at startup, and the Worker carries its own core.
// The app is the largest, about 1003 kB with the React Compiler's caches and the phone layout
const CHUNK_SIZE_LIMIT_KB = 1010;

/**
 * The folders the app is built from. The dev server watches only these and the files in the
 * root, so other folders there (notes, local tools) can change without waking it.
 */
const SOURCE_FOLDERS = new Set(["src", "public"]);

function isOutsideSources(file: string) {
    const relative = path.relative(import.meta.dirname, file);
    const [top] = relative.split(path.sep);
    // A linked spessasynth_core lives outside the project and is still watched
    return (
        relative.includes(path.sep) && top !== ".." && !SOURCE_FOLDERS.has(top)
    );
}

/**
 * Lists the built files in precache.json, which the service worker caches on install. Without
 * it, a file loaded only later (the Worker's own copy of the encoder) is cached only when it was
 * used online.
 */
const PRECACHE_LIST: Plugin = {
    name: "spessafont-precache-list",
    apply: "build",
    // The bundle holds the Worker's files too
    writeBundle: ({ dir = "dist" }, bundle) => {
        const files = Object.keys(bundle).filter(
            (file) => file !== "index.html"
        );
        writeFileSync(path.join(dir, "precache.json"), JSON.stringify(files));
    }
};

/**
 * The desktop app runs from file://, so its policy comes in a meta tag. The Worker and the
 * worklet load from the app's folder, the encoder compiles wasm, and opened banks are fetched
 * from file:// URLs. React and the toasts set inline styles.
 */
const ELECTRON_CSP = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' file: blob:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
].join("; ");

/**
 * Adds the CSP to the page of the desktop build (`vite build --mode electron`). The web app does
 * not get it, as GitHub Pages and the dev server need other sources.
 */
const ELECTRON_CSP_TAG: Plugin = {
    name: "spessafont-electron-csp",
    apply: (_, { command, mode }) => command === "build" && mode === "electron",
    transformIndexHtml: () => [
        {
            tag: "meta",
            attrs: {
                "http-equiv": "Content-Security-Policy",
                content: ELECTRON_CSP
            },
            injectTo: "head-prepend"
        }
    ]
};

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 5173,
        strictPort: true,
        host: "127.0.0.1",
        watch: { ignored: isOutsideSources }
    },
    // The React Compiler caches by identity, which works as render reads only the frozen views
    plugins: [
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        PRECACHE_LIST,
        ELECTRON_CSP_TAG
    ],
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
