import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    files: ["components/experience/CyberWorld.tsx"],
    rules: {
      // React Three Fiber deliberately mutates Three.js objects inside its render loop.
      "react-hooks/immutability": "off",
    },
  },
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
  ]),
]);
