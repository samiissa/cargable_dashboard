import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/coverage/**", "backend/api/handler.js"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
