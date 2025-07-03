import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow any types for development speed
      "@typescript-eslint/no-explicit-any": "off",
      
      // Allow unused variables (useful during development)
      "@typescript-eslint/no-unused-vars": "off",
      
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "off",
      
      // Allow prefer-const warnings
      "prefer-const": "off",
      
      // Allow next/image warnings for development
      "@next/next/no-img-element": "warn",
      
      // Allow react hooks warnings
      "react-hooks/exhaustive-deps": "warn",
      
      // Allow console statements during development
      "no-console": "off",
    }
  }
];

export default eslintConfig;
