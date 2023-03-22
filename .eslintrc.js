module.exports = {
  plugins: ["@typescript-eslint", "prettier"],
  ignorePatterns: ["dist/**/*", "**/node_modules/**"],
  extends: ["standard-with-typescript", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: true,
  },
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/strict-boolean-expressions": "off",
  },
  overrides: [
    {
      files: "**/*.js",
      parserOptions: {
        project: null,
      },
    },
    {
      files: "**/*.spec.ts",
      rules: {
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  root: true,
};
