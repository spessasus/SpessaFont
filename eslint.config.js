import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintConfigPrettier from "eslint-config-prettier";
import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";

// React Compiler rules report problems that need the store from REFACTOR_PLAN.md phase 2.
// They are warnings until the phase that owns each file lands, and errors again in phase 8.
const reactCompilerRulesAsWarnings = Object.fromEntries(
    Object.keys(reactHooks.configs.recommended.rules)
        .filter(
            (rule) =>
                rule !== "react-hooks/rules-of-hooks" &&
                rule !== "react-hooks/exhaustive-deps"
        )
        .map((rule) => [rule, "warn"])
);

export default defineConfig(
    globalIgnores(["dist", "externals"]),
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
            eqeqeq: "error",
            "no-fallthrough": ["error", { allowEmptyCase: true }],
            ...reactHooks.configs.recommended.rules,
            ...reactCompilerRulesAsWarnings,
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
            ],

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

            // The waveform path changes on every draw, so caching a Path2D buys nothing.
            // Revisit when wave_view is rewritten (REFACTOR_PLAN.md phase 6)
            "unicorn/prefer-path2d": "off"
        }
    },
    {
        files: ["src/vite-env.d.ts"],
        rules: {
            "unicorn/filename-case": "off"
        }
    }
);
