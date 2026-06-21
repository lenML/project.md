import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2020 },
      parserOptions: {
        projectService: { defaultProject: "tsconfig.json" },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["snake_case"], leadingUnderscore: "allow" },
        { selector: ["objectLiteralProperty", "typeProperty", "property", "method"], format: null },
        { selector: "typeLike", format: ["PascalCase"] },
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["snake_case", "UPPER_CASE", "camelCase", "PascalCase"],
        },
        { selector: "import", format: ["snake_case", "camelCase", "PascalCase"] },
        { selector: "function", format: ["snake_case", "PascalCase", "camelCase"] },
        { selector: "parameter", format: ["snake_case", "camelCase"], leadingUnderscore: "allow" },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-for-of": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
);