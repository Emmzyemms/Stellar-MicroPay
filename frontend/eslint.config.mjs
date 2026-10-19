import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "playwright-report/**", "test-results/**"]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "import/no-anonymous-default-export": "off",
      // Use the "@/" alias (see tsconfig.json "paths") instead of climbing
      // directories with "../". Same-directory "./" imports are fine.
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["../*", "../**"],
              message:
                'Use the "@/" alias for internal imports (e.g. "@/lib/stellar") instead of relative "../" paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/__tests__/**", "e2e/**"],
    rules: {
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);
