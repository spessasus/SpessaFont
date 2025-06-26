import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: "./",
    resolve: {
        alias: {
            "sl-web-ogg": path.resolve(
                __dirname,
                "externals/sl-web-ogg/dist/index.min.js"
            )
        }
    },
    build: {
        target: "esnext"
    },
    esbuild: {
        target: "esnext"
    }
});
