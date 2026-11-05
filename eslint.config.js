import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintConfigPrettier from "eslint-config-prettier";
import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";

// Rules for every linted file, TypeScript or JavaScript
const COMMON_RULES = {
    eqeqeq: "error",
    "no-fallthrough": ["error", { allowEmptyCase: true }],

    // Spessasynth uses snake_case
    "unicorn/filename-case": [
        "error",
        {
            cases: {
                snakeCase: true
            }
        }
    ],
    // Often used for new Array<type>, more cluttered with Array.from
    "unicorn/no-new-array": "off",
    // Useful in events
    "unicorn/no-null": "off",
    // Technical stuff like "modulators" or "envelopes" not commonly used
    // TODO add proper rules for this later
    "unicorn/name-replacements": "off",

    // Need to pass undefined as value sometimes (for example getGenerator)
    "unicorn/no-useless-undefined": "off",
    // Crucial DSP code
    "unicorn/no-for-loop": "off",

    // Not in the RMIDI world
    "unicorn/text-encoding-identifier-case": "off",

    // I don't like it
    "unicorn/prefer-at": "off",

    // Doesn't work with typed arrays
    "unicorn/prefer-spread": "off",

    // No need to hold function references
    "unicorn/prefer-add-event-listener": "off",

    // We are targeting es2022
    "unicorn/no-array-reverse": "off",
    "unicorn/no-array-sort": "off",

    // Strips the leading asterisks that multi-line JSDoc relies on
    "unicorn/no-asterisk-prefix-in-documentation-comments": "off",

    // Every canvas path (wave, play head, oscilloscope) changes on each draw, so a
    // cached Path2D would be rebuilt every time anyway
    "unicorn/prefer-path2d": "off"
};

export default defineConfig(
    globalIgnores(["dist"]),
    {
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            eslintPluginUnicorn.configs.recommended,
            eslintConfigPrettier
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh
        },
        rules: {
            ...COMMON_RULES,
            ...reactHooks.configs.recommended.rules,
            // The recommended config only warns about it
            "react-hooks/unsupported-syntax": "error",
            // useVirtualizer returns a mutable object by design
            "react-hooks/incompatible-library": "warn",
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true }
            ],
            "@typescript-eslint/no-deprecated": "error",
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: false
                }
            ]
        }
    },
    // The Electron main process, its preload and the service worker are plain JavaScript,
    // type checked through JSDoc by tsconfig.node.json and tsconfig.sw.json
    {
        extends: [
            eslint.configs.recommended,
            eslintPluginUnicorn.configs.recommended,
            eslintConfigPrettier
        ],
        files: ["electron/*.js", "public/*.js"],
        languageOptions: { ecmaVersion: "latest" },
        rules: COMMON_RULES
    },
    {
        files: ["electron/*.js"],
        languageOptions: { globals: globals.node }
    },
    {
        // A sandboxed preload cannot be an ES module
        files: ["electron/preload.js"],
        languageOptions: { sourceType: "commonjs" },
        rules: { "unicorn/prefer-module": "off" }
    },
    {
        files: ["public/service-worker.js"],
        languageOptions: { globals: globals.serviceworker },
        // Installed workers are registered under this name
        rules: { "unicorn/filename-case": "off" }
    },
    {
        files: ["src/vite-env.d.ts"],
        rules: {
            "unicorn/filename-case": "off"
        }
    }
);
