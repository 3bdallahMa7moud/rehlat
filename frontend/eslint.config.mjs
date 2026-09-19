import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "dist/**",
      "src/App.tsx",
      "src/main.tsx",
      "src/App.css",
      "src/index.css",
      "src/store/**",
      "src/assets/**",
      "src/types/index.ts",
      "src/components/alerts/**",
      "src/components/admin/**",
      "src/components/auth/LoginPage.tsx",
      "src/components/bot/**",
      "src/components/common/**",
      "src/components/focus/**",
      "src/components/leaderboard/**",
      "src/components/live/**",
      "src/components/reports/**",
      "src/components/tasks/**",
      "src/components/today/**",
      "src/components/layout/Footer.tsx",
      "src/components/layout/Navbar.tsx",
      "src/components/layout/StickyActivityBar.tsx",
    ],
  },
];

export default config;
