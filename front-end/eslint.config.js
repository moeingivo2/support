import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "node_modules", "playwright-report", "test-results"] },
    {
        extends: [js.configs.recommended, tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2023,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // قوانین مشاوره‌ای React Compiler اینجا warn می‌مانند:
            // الگوی setState داخل effect در چندین کامپوننت موجود (فرم،
            // پیش‌نمایش فایل، IntersectionObserver) عمداً استفاده شده و
            // بازنویسی آن‌ها ریسک رفتاری دارد.
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/incompatible-library": "warn",
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
);
