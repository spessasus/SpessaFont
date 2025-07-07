import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    base: "",
    plugins: [react()],
    resolve: {
        alias: {
            "sl-web-ogg": path.resolve(
                __dirname,
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
    esbuild: {
        target: "esnext"
    }
});
