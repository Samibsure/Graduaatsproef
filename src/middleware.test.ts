import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * De matcher bepaalt of de taalmiddleware over een pad gaat, en die
 * herschrijft alles zonder taalvoorvoegsel naar `/nl/<pad>`. Voor de routes
 * buiten `src/app/[locale]/` bestaat dat doel niet, en dan volgt een 404 op de
 * bevestigingsmail, de herstellink, de inloglink en het afmelden.
 *
 * Deze test leest de matcher uit het bestand zelf in plaats van de expressie
 * hier over te typen. Een kopie zou stilzwijgend uit de pas kunnen lopen met wat
 * Next.js werkelijk gebruikt, en dan bewaakt de test niets meer.
 */
function matcherUitBron(): RegExp {
  const bron = readFileSync(new URL("./middleware.ts", import.meta.url), "utf8");
  const regel = bron.match(/"(\/\(\(\?!.*)",/);
  if (!regel) throw new Error("Geen matcher gevonden in src/middleware.ts");
  // De bron staat in een TypeScript-string, dus de backslashes zijn er dubbel.
  return new RegExp(`^${JSON.parse(`"${regel[1]}"`)}$`);
}

const matcher = matcherUitBron();

/** Routes buiten [locale]: de taalmiddleware mag er niet aan komen. */
const MET_RUST = [
  "/auth/callback",
  "/afmelden",
  "/robots.txt",
  "/sitemap.xml",
  "/cars/bmw-i4.jpg",
  // Zit wél onder [locale], maar mag niet omgeleid worden: niet elke scraper
  // volgt een 307 voor een og:image.
  "/nl/opengraph-image",
  "/fr/opengraph-image",
  "/icon.svg",
  "/favicon.ico",
  "/_next/static/chunk.js",
];

/** Gewone pagina's: die hebben de taalbepaling en de sessieverversing nodig. */
const DOORLATEN = [
  "/",
  "/catalogus",
  "/simulator",
  "/wagens",
  "/nl/wagens",
  "/fr/simulator",
  "/en/vergelijking",
  "/beheer/parameters",
  // Begint met "auth" maar is geen auth-route; de uitzondering mag niet te ruim zijn.
  "/authentiek",
];

describe("middleware-matcher", () => {
  it.each(MET_RUST)("laat %s met rust", (pad) => {
    expect(matcher.test(pad)).toBe(false);
  });

  it.each(DOORLATEN)("laat de middleware over %s gaan", (pad) => {
    expect(matcher.test(pad)).toBe(true);
  });
});
