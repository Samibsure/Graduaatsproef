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
    /*
     * De lijstvorm en niet de objectvorm, want een objectalias vervangt elk
     * voorvoegsel: "next/navigation" zou dan ook in "next/navigation.js" opnieuw
     * vervangen worden, tot "next/navigation.js.js". Met een geankerde reguliere
     * expressie gebeurt dat één keer.
     *
     * De alias is nodig omdat next-intl `next/navigation` zonder extensie
     * importeert. Onder de ESM-resolutie van Node vindt vitest dat bestand niet,
     * waardoor elke componenttest die een taalbewuste <Link> rendert struikelt op
     * de import in plaats van op de component.
     */
    alias: [
      { find: /^@\//, replacement: `${new URL("./src", import.meta.url).pathname}/` },
      { find: /^next\/navigation$/, replacement: "next/navigation.js" },
    ],
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
          /*
           * next-intl moet door vite heen in plaats van als externe module
           * ingeladen te worden. Anders geldt de alias hierboven er niet voor en
           * blijft zijn extensieloze import van `next/navigation` onvindbaar.
           */
          server: { deps: { inline: ["next-intl"] } },
        },
      },
    ],
  },
});
