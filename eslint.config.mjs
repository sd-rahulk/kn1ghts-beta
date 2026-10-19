import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    files: ["components/ui/MemberPortrait.tsx"],
    rules: {
      // Remote member URLs are runtime data and retain a native-image error fallback.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "responsive_screenshots/**",
    ".qa-chrome/**",
    ".qa-community/**",
    "backend/**",
    ".firebase-emulators/**",
    ".firebase-config/**",
    ".npm-cache/**",
    ".qa-browser*/**",
    ".staging-push/**",
  ]),
]);
