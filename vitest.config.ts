import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Twee omgevingen, want de codebase heeft twee soorten tests.
 *
 * De rekenkern is pure TypeScript en draait in node: snel, en zonder DOM.
 * Componenten hebben jsdom nodig.
 *
 * Dat tweede project is nieuw. De configuratie hield tot nu toe alleen
 * `src/**` met extensie `.test.ts` in node aan, waardoor `.tsx` structureel
 * buiten de tests viel: geen enkele test raakte React, de routering of de
 * datalaag. Elke fout in een laad-, fout- of lege toestand was daardoor
 * onzichtbaar voor de CI, en precies daar zat het merendeel van de gebreken uit
 * de audit.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "rekenkern",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "componenten",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/test/opzet.ts"],
        },
      },
    ],
  },
});
