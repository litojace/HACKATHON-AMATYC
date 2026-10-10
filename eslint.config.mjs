import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default ts.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
